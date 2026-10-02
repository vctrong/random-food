import { z } from "zod";
import type { OpeningDay, OpeningRange, OpeningSchedule } from "@/types/restaurant";

/**
 * Giờ mở cửa có cấu trúc — hàm thuần dùng chung client/server (docs/opening-hours.md):
 * schema zod, trạng thái đang mở/sắp đóng (`getOpenStatus`, theo giờ Asia/Ho_Chi_Minh),
 * chuỗi tóm tắt gọn, và đọc chuỗi cũ "06:00 - 21:00".
 */

export const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
export const DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;
export const MAX_RANGES_PER_DAY = 3;
/** Còn ≤ bấy nhiêu phút là "sắp đóng". */
export const CLOSING_SOON_MINUTES = 30;
export const SCHEDULE_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const UNKNOWN_HOURS_LABEL = "Chưa có giờ mở cửa";

const MINUTES_PER_DAY = 24 * 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(total: number): string {
  const value = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** Khoảng phút [start, end) tính từ 00:00 của ngày đó; qua đêm thì end > 1440. */
function rangeInterval(range: OpeningRange): [number, number] {
  const start = toMinutes(range.open);
  const close = toMinutes(range.close);
  return [start, close <= start ? close + MINUTES_PER_DAY : close];
}

export function isOvernight(range: OpeningRange): boolean {
  return toMinutes(range.close) <= toMinutes(range.open);
}

/* ------------------------------------------------------------------ */
/* Validate (zod) — dùng chung form client và API server               */
/* ------------------------------------------------------------------ */

const timeSchema = z.string().regex(TIME_PATTERN, "Giờ phải có dạng HH:mm (00:00–23:59).");

const rangeSchema = z
  .object({ open: timeSchema, close: timeSchema })
  .strict()
  .refine((range) => range.open !== range.close, "Giờ mở và giờ đóng không được trùng nhau — mở cả ngày thì chọn “Mở 24 giờ”.");

const daySchema = z
  .object({
    day: z.number().int().min(0).max(6),
    closed: z.boolean(),
    allDay: z.boolean(),
    ranges: z.array(rangeSchema).max(MAX_RANGES_PER_DAY, `Mỗi ngày tối đa ${MAX_RANGES_PER_DAY} khung giờ.`),
  })
  .strict()
  .superRefine((day, ctx) => {
    const name = DAY_NAMES[day.day] ?? "Ngày";
    if (day.closed && day.allDay) {
      ctx.addIssue({ code: "custom", message: `${name}: không thể vừa nghỉ vừa mở 24 giờ.` });
      return;
    }
    if (day.closed || day.allDay) {
      if (day.ranges.length > 0) ctx.addIssue({ code: "custom", message: `${name}: nghỉ / mở 24 giờ thì không nhập khung giờ.` });
      return;
    }
    if (day.ranges.length === 0) {
      ctx.addIssue({ code: "custom", message: `${name}: cần ít nhất 1 khung giờ (hoặc chọn nghỉ / mở 24 giờ).` });
      return;
    }
    const intervals = day.ranges.map(rangeInterval).sort((a, b) => a[0] - b[0]);
    if (day.ranges.filter(isOvernight).length > 1) {
      ctx.addIssue({ code: "custom", message: `${name}: chỉ được 1 khung giờ qua đêm.` });
    }
    for (let index = 1; index < intervals.length; index += 1) {
      if (intervals[index][0] < intervals[index - 1][1]) {
        ctx.addIssue({ code: "custom", message: `${name}: các khung giờ bị chồng lên nhau.` });
        return;
      }
    }
  });

/** Phần qua đêm của `day` (phút sau 00:00 hôm sau), 0 nếu không có. */
function spillOver(day: OpeningDay): number {
  if (day.closed || day.allDay) return 0;
  return Math.max(0, ...day.ranges.map((range) => rangeInterval(range)[1] - MINUTES_PER_DAY));
}

export const openingScheduleSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unknown") }).strict(),
  z
    .object({
      status: z.literal("known"),
      mode: z.enum(["daily", "weekly"]),
      days: z.array(daySchema).length(7, "Cần đủ 7 ngày trong tuần."),
    })
    .strict()
    .superRefine((schedule, ctx) => {
      const order = schedule.days.map((day) => day.day);
      if (order.some((day, index) => day !== index)) {
        ctx.addIssue({ code: "custom", message: "Các ngày phải đủ và đúng thứ tự Thứ 2 → Chủ nhật." });
        return;
      }
      if (schedule.days.every((day) => day.closed)) {
        ctx.addIssue({ code: "custom", message: "Quán nghỉ cả tuần? Nếu chưa rõ giờ, hãy chọn “Không rõ giờ”." });
      }
      // Khung qua đêm không được lấn sang khung đầu của hôm sau.
      for (const day of schedule.days) {
        const spill = spillOver(day);
        const next = schedule.days[(day.day + 1) % 7];
        if (spill === 0 || next.closed) continue;
        const nextStart = next.allDay ? 0 : Math.min(...next.ranges.map((range) => toMinutes(range.open)));
        if (nextStart < spill) {
          ctx.addIssue({
            code: "custom",
            message: `${DAY_NAMES[day.day]}: khung qua đêm tới ${formatMinutes(spill)} chồng lên giờ mở của ${DAY_NAMES[next.day]}.`,
          });
        }
      }
    }),
]);

/** null = hợp lệ; ngược lại là câu lỗi đầu tiên (tiếng Việt) để hiện trên form. */
export function validateOpeningSchedule(value: unknown): string | null {
  const result = openingScheduleSchema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "Giờ mở cửa chưa hợp lệ.");
}

/* ------------------------------------------------------------------ */
/* Dựng lịch                                                          */
/* ------------------------------------------------------------------ */

export function createDailySchedule(day: Omit<OpeningDay, "day">): OpeningSchedule {
  return {
    status: "known",
    mode: "daily",
    days: Array.from({ length: 7 }, (_, index) => ({ ...day, day: index, ranges: day.ranges.map((range) => ({ ...range })) })),
  };
}

/** Đọc chuỗi tự do cũ dạng "06:00 - 21:00" (dữ liệu trước khi có openingSchedule); không đọc được → null. */
export function parseLegacyOpeningHours(text: string | null | undefined): OpeningSchedule | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/.exec(text ?? "");
  if (!match) return null;
  const pad = (hours: string, minutes: string) => `${hours.padStart(2, "0")}:${minutes}`;
  const range = { open: pad(match[1], match[2]), close: pad(match[3], match[4]) };
  const schedule = createDailySchedule({ closed: false, allDay: false, ranges: [range] });
  return openingScheduleSchema.safeParse(schedule).success ? schedule : null;
}

/** Lịch hiệu lực: field có cấu trúc, không có thì thử đọc chuỗi cũ, cuối cùng là "không rõ". */
export function resolveOpeningSchedule(schedule: OpeningSchedule | null | undefined, legacyText?: string | null): OpeningSchedule {
  if (schedule && openingScheduleSchema.safeParse(schedule).success) return schedule;
  return parseLegacyOpeningHours(legacyText) ?? { status: "unknown" };
}

/**
 * Field ghi vào Restaurant: lịch có cấu trúc + chuỗi tóm tắt `openingHours` (chỗ cũ đọc chuỗi vẫn chạy).
 * "Không rõ giờ" thì bỏ chuỗi tóm tắt.
 */
export function toStoredOpeningHours(schedule: OpeningSchedule): { openingSchedule: OpeningSchedule; openingHours: string | undefined } {
  return { openingSchedule: schedule, openingHours: schedule.status === "known" ? formatOpeningSchedule(schedule) : undefined };
}

/* ------------------------------------------------------------------ */
/* Hiển thị gọn                                                        */
/* ------------------------------------------------------------------ */

function describeDay(day: OpeningDay): string {
  if (day.closed) return "Nghỉ";
  if (day.allDay) return "Mở 24 giờ";
  return [...day.ranges]
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))
    .map((range) => `${range.open}–${range.close}`)
    .join(", ");
}

/**
 * "Hằng ngày 06:00–10:00, 16:00–21:00" · "T2–T6: 06:00–21:00 · T7, CN: Mở 24 giờ" · "Chưa có giờ mở cửa".
 * Cũng là giá trị lưu vào `restaurants.openingHours` (chuỗi cũ) để các chỗ đọc chuỗi vẫn chạy.
 */
export function formatOpeningSchedule(schedule: OpeningSchedule): string {
  if (schedule.status === "unknown") return UNKNOWN_HOURS_LABEL;
  const texts = schedule.days.map(describeDay);
  if (texts.every((text) => text === texts[0])) return texts[0] === "Nghỉ" ? "Nghỉ cả tuần" : `Hằng ngày ${texts[0]}`;

  const groups: { from: number; to: number; text: string }[] = [];
  texts.forEach((text, index) => {
    const last = groups[groups.length - 1];
    if (last && last.text === text && last.to === index - 1) last.to = index;
    else groups.push({ from: index, to: index, text });
  });
  const label = (group: { from: number; to: number }) =>
    group.from === group.to
      ? DAY_LABELS[group.from]
      : group.to === group.from + 1
        ? `${DAY_LABELS[group.from]}, ${DAY_LABELS[group.to]}`
        : `${DAY_LABELS[group.from]}–${DAY_LABELS[group.to]}`;
  return groups.map((group) => `${label(group)}: ${group.text}`).join(" · ");
}

/* ------------------------------------------------------------------ */
/* Trạng thái đang mở                                                  */
/* ------------------------------------------------------------------ */

export type OpenState = "open" | "closing_soon" | "closed" | "unknown";

export interface OpenStatus {
  state: OpenState;
  /** "HH:mm" giờ Việt Nam lúc đóng cửa (khi đang mở); null nếu mở liên tục ≥ 2 ngày tới hoặc không áp dụng. */
  closesAt: string | null;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const vnClock = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHEDULE_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Thứ (0 = T2) và phút trong ngày theo giờ Việt Nam, bất kể múi giờ của máy chạy code. */
export function getVietnamClock(now: Date): { day: number; minutes: number } {
  const parts = Object.fromEntries(vnClock.formatToParts(now).map((part) => [part.type, part.value]));
  return { day: WEEKDAY_INDEX[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/**
 * Đang mở / sắp đóng (≤ 30 phút) / đã đóng / không rõ — tại thời điểm `now`, theo giờ Asia/Ho_Chi_Minh.
 * Xét hôm qua (phần qua đêm), hôm nay, ngày mai và GỘP các khung nối liền nhau, nên ca qua đêm
 * và các ngày mở 24 giờ liên tiếp không bị báo "sắp đóng" nhầm lúc nửa đêm.
 */
export function getOpenStatus(schedule: OpeningSchedule | null | undefined, now: Date): OpenStatus {
  if (!schedule || schedule.status !== "known") return { state: "unknown", closesAt: null };
  const { day: today, minutes } = getVietnamClock(now);

  const intervals: [number, number][] = [];
  for (const offset of [-1, 0, 1]) {
    const day = schedule.days[(today + offset + 7) % 7];
    if (!day || day.closed) continue;
    const base = offset * MINUTES_PER_DAY;
    if (day.allDay) intervals.push([base, base + MINUTES_PER_DAY]);
    else for (const range of day.ranges) {
      const [start, end] = rangeInterval(range);
      intervals.push([base + start, base + end]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
    else merged.push([...interval]);
  }

  const current = merged.find(([start, end]) => start <= minutes && minutes < end);
  if (!current) return { state: "closed", closesAt: null };
  // Khung kéo tới hết ngày mai (vd mở 24 giờ liên tục) — không biết chắc giờ đóng trong cửa sổ đang xét.
  if (current[1] >= 2 * MINUTES_PER_DAY) return { state: "open", closesAt: null };
  return {
    state: current[1] - minutes <= CLOSING_SOON_MINUTES ? "closing_soon" : "open",
    closesAt: formatMinutes(current[1]),
  };
}

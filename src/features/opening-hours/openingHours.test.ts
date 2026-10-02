import { describe, expect, it } from "vitest";
import {
  createDailySchedule,
  formatOpeningSchedule,
  getOpenStatus,
  getVietnamClock,
  parseLegacyOpeningHours,
  resolveOpeningSchedule,
  validateOpeningSchedule,
} from "./openingHours";
import type { OpeningDay, OpeningSchedule } from "@/types/restaurant";

/** Thời điểm theo giờ Việt Nam (UTC+7, không có giờ mùa hè). 2026-10-05 là Thứ 2. */
const vn = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);
const MON = "2026-10-05";
const TUE = "2026-10-06";
const SUN = "2026-10-11";

const day = (index: number, patch: Partial<OpeningDay> = {}): OpeningDay => ({
  day: index,
  closed: false,
  allDay: false,
  ranges: [{ open: "06:00", close: "21:00" }],
  ...patch,
});
const weekly = (patches: Record<number, Partial<OpeningDay>>): OpeningSchedule => ({
  status: "known",
  mode: "weekly",
  days: Array.from({ length: 7 }, (_, index) => day(index, patches[index])),
});

describe("getVietnamClock", () => {
  it("quy về giờ Việt Nam dù Date tạo theo UTC", () => {
    // 2026-10-05 17:30 UTC = 2026-10-06 00:30 giờ VN (Thứ 3).
    expect(getVietnamClock(new Date("2026-10-05T17:30:00Z"))).toEqual({ day: 1, minutes: 30 });
  });
});

describe("getOpenStatus", () => {
  const daily = createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "06:00", close: "10:00" }, { open: "16:00", close: "21:00" }] });

  it("đang mở / sắp đóng (≤ 30 phút) / đã đóng giữa 2 khung", () => {
    expect(getOpenStatus(daily, vn(MON, "07:00"))).toEqual({ state: "open", closesAt: "10:00" });
    expect(getOpenStatus(daily, vn(MON, "09:30"))).toEqual({ state: "closing_soon", closesAt: "10:00" });
    expect(getOpenStatus(daily, vn(MON, "09:29")).state).toBe("open");
    expect(getOpenStatus(daily, vn(MON, "10:00")).state).toBe("closed");
    expect(getOpenStatus(daily, vn(MON, "12:00")).state).toBe("closed");
    expect(getOpenStatus(daily, vn(MON, "05:59")).state).toBe("closed");
  });

  it("ca qua đêm 18:00–02:00: mở sau nửa đêm (tính từ hôm trước), sắp đóng lúc 01:45", () => {
    const night = createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "18:00", close: "02:00" }] });
    expect(getOpenStatus(night, vn(MON, "23:00"))).toEqual({ state: "open", closesAt: "02:00" });
    expect(getOpenStatus(night, vn(TUE, "00:30"))).toEqual({ state: "open", closesAt: "02:00" });
    expect(getOpenStatus(night, vn(TUE, "01:45"))).toEqual({ state: "closing_soon", closesAt: "02:00" });
    expect(getOpenStatus(night, vn(TUE, "02:00")).state).toBe("closed");
  });

  it("qua đêm từ hôm trước vẫn mở dù hôm nay nghỉ", () => {
    const schedule = weekly({ 0: { ranges: [{ open: "18:00", close: "02:00" }] }, 1: { closed: true, ranges: [] } });
    expect(getOpenStatus(schedule, vn(TUE, "01:00")).state).toBe("open");
    expect(getOpenStatus(schedule, vn(TUE, "12:00")).state).toBe("closed");
  });

  it("mở 24 giờ liên tục không bị báo sắp đóng lúc nửa đêm", () => {
    const always = createDailySchedule({ closed: false, allDay: true, ranges: [] });
    expect(getOpenStatus(always, vn(MON, "23:50"))).toEqual({ state: "open", closesAt: null });
  });

  it("mở 24 giờ hôm nay nhưng mai nghỉ → sắp đóng lúc 23:45, đóng lúc 00:00", () => {
    const schedule = weekly({ 6: { allDay: true, ranges: [] }, 0: { closed: true, ranges: [] } });
    expect(getOpenStatus(schedule, vn(SUN, "23:45"))).toEqual({ state: "closing_soon", closesAt: "00:00" });
  });

  it("khung nối liền sang ngày mai (21:00–24:00 + 00:00–03:00) gộp làm 1", () => {
    const schedule = weekly({ 0: { ranges: [{ open: "21:00", close: "00:00" }] }, 1: { ranges: [{ open: "00:00", close: "03:00" }] } });
    expect(getOpenStatus(schedule, vn(MON, "23:50"))).toEqual({ state: "open", closesAt: "03:00" });
  });

  it("nghỉ ngày cụ thể → đã đóng", () => {
    expect(getOpenStatus(weekly({ 6: { closed: true, ranges: [] } }), vn(SUN, "12:00")).state).toBe("closed");
  });

  it("không rõ giờ / chưa có lịch → unknown", () => {
    expect(getOpenStatus({ status: "unknown" }, vn(MON, "12:00")).state).toBe("unknown");
    expect(getOpenStatus(null, vn(MON, "12:00")).state).toBe("unknown");
  });
});

describe("validateOpeningSchedule", () => {
  it("hợp lệ: nhanh, chi tiết nhiều khung, qua đêm, 24 giờ, nghỉ, không rõ", () => {
    expect(validateOpeningSchedule(createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "18:00", close: "02:00" }] }))).toBeNull();
    expect(
      validateOpeningSchedule(
        weekly({ 0: { ranges: [{ open: "06:00", close: "10:00" }, { open: "16:00", close: "21:00" }] }, 5: { allDay: true, ranges: [] }, 6: { closed: true, ranges: [] } }),
      ),
    ).toBeNull();
    expect(validateOpeningSchedule({ status: "unknown" })).toBeNull();
  });

  it("chặn giờ sai định dạng, giờ mở = giờ đóng, khung chồng nhau", () => {
    expect(validateOpeningSchedule(weekly({ 0: { ranges: [{ open: "25:00", close: "21:00" }] } }))).toMatch(/HH:mm/);
    expect(validateOpeningSchedule(weekly({ 0: { ranges: [{ open: "08:00", close: "08:00" }] } }))).toMatch(/trùng/);
    expect(validateOpeningSchedule(weekly({ 0: { ranges: [{ open: "06:00", close: "12:00" }, { open: "11:00", close: "14:00" }] } }))).toMatch(
      /chồng/,
    );
  });

  it("chặn ngày thiếu khung giờ, nghỉ kèm khung giờ, quá 3 khung", () => {
    expect(validateOpeningSchedule(weekly({ 2: { ranges: [] } }))).toMatch(/ít nhất 1 khung/);
    expect(validateOpeningSchedule(weekly({ 2: { closed: true } }))).toMatch(/không nhập khung giờ/);
    const four = ["06:00", "09:00", "12:00", "15:00"].map((open) => ({ open, close: `${String(Number(open.slice(0, 2)) + 2).padStart(2, "0")}:00` }));
    expect(validateOpeningSchedule(weekly({ 0: { ranges: four } }))).toMatch(/tối đa 3/);
  });

  it("chặn khung qua đêm lấn sang giờ mở của hôm sau", () => {
    const schedule = weekly({ 0: { ranges: [{ open: "18:00", close: "07:00" }] } });
    expect(validateOpeningSchedule(schedule)).toMatch(/chồng lên giờ mở của Thứ 3/);
    // Hôm sau nghỉ thì không sao.
    expect(validateOpeningSchedule(weekly({ 0: { ranges: [{ open: "18:00", close: "07:00" }] }, 1: { closed: true, ranges: [] } }))).toBeNull();
  });

  it("chặn thiếu ngày, nghỉ cả tuần, field lạ", () => {
    const schedule = createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "06:00", close: "21:00" }] });
    expect(validateOpeningSchedule({ ...schedule, days: schedule.status === "known" ? schedule.days.slice(0, 6) : [] })).toMatch(/7 ngày/);
    expect(validateOpeningSchedule(createDailySchedule({ closed: true, allDay: false, ranges: [] }))).toMatch(/Không rõ giờ/);
    expect(validateOpeningSchedule({ status: "unknown", note: "x" })).not.toBeNull();
    expect(validateOpeningSchedule(null)).not.toBeNull();
  });
});

describe("formatOpeningSchedule", () => {
  it("gọn cho lịch giống nhau mọi ngày, nhóm ngày liên tiếp cho lịch chi tiết", () => {
    expect(formatOpeningSchedule(createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "16:00", close: "21:00" }, { open: "06:00", close: "10:00" }] }))).toBe(
      "Hằng ngày 06:00–10:00, 16:00–21:00",
    );
    expect(formatOpeningSchedule(weekly({ 5: { allDay: true, ranges: [] }, 6: { allDay: true, ranges: [] } }))).toBe(
      "T2–T6: 06:00–21:00 · T7, CN: Mở 24 giờ",
    );
    expect(formatOpeningSchedule(weekly({ 6: { closed: true, ranges: [] } }))).toBe("T2–T7: 06:00–21:00 · CN: Nghỉ");
    expect(formatOpeningSchedule({ status: "unknown" })).toBe("Chưa có giờ mở cửa");
  });
});

describe("chuỗi giờ cũ", () => {
  it("đọc được '06:00 - 21:00' / '6:30–22:00', không đọc được thì null", () => {
    expect(parseLegacyOpeningHours("06:00 - 21:00")).toEqual(
      createDailySchedule({ closed: false, allDay: false, ranges: [{ open: "06:00", close: "21:00" }] }),
    );
    expect(parseLegacyOpeningHours("6:30–22:00")?.status).toBe("known");
    expect(parseLegacyOpeningHours("Sáng 6h tới tối")).toBeNull();
    expect(parseLegacyOpeningHours(undefined)).toBeNull();
  });

  it("resolve: ưu tiên lịch có cấu trúc, rồi chuỗi cũ, cuối cùng là không rõ", () => {
    expect(resolveOpeningSchedule({ status: "unknown" }, "06:00 - 21:00")).toEqual({ status: "unknown" });
    expect(resolveOpeningSchedule(undefined, "06:00 - 21:00").status).toBe("known");
    expect(resolveOpeningSchedule(undefined, "linh tinh")).toEqual({ status: "unknown" });
  });
});

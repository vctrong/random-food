"use client";

import { useState } from "react";
import { CalendarDays, Clock, HelpCircle, MoonStar, Plus, X } from "lucide-react";
import {
  DAY_NAMES,
  MAX_RANGES_PER_DAY,
  createDailySchedule,
  isOvernight,
  validateOpeningSchedule,
} from "@/features/opening-hours/openingHours";
import { cn } from "@/lib/utils";
import type { OpeningDay, OpeningRange, OpeningSchedule } from "@/types/restaurant";

type Mode = "daily" | "weekly" | "unknown";
type DayKind = "hours" | "allDay" | "closed";

interface OpeningHoursFieldProps {
  /** null = chưa nhập gì (chưa hợp lệ — bắt buộc nhập giờ hoặc chọn "Không rõ giờ"). */
  value: OpeningSchedule | null;
  onChange: (schedule: OpeningSchedule) => void;
  /** Hiện lỗi validate (vd sau khi user đã chạm vào hoặc bấm gửi). */
  showErrors?: boolean;
  labelledBy?: string;
}

const MODES: { id: Mode; label: string; icon: typeof Clock }[] = [
  { id: "daily", label: "Giống nhau mọi ngày", icon: Clock },
  { id: "weekly", label: "Chi tiết từng ngày", icon: CalendarDays },
  { id: "unknown", label: "Không rõ giờ", icon: HelpCircle },
];

const EMPTY_RANGE: OpeningRange = { open: "", close: "" };
const timeInputClass =
  "h-10 w-[7.5rem] px-3 rounded-xl border border-border bg-surface text-sm text-text-primary tabular-nums focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const openDay = (day: number, ranges: OpeningRange[] = [{ ...EMPTY_RANGE }]): OpeningDay => ({ day, closed: false, allDay: false, ranges });

function initialState(value: OpeningSchedule | null) {
  if (!value) return { mode: "daily" as Mode, daily: openDay(0), weekly: Array.from({ length: 7 }, (_, index) => openDay(index)) };
  if (value.status === "unknown") {
    return { mode: "unknown" as Mode, daily: openDay(0), weekly: Array.from({ length: 7 }, (_, index) => openDay(index)) };
  }
  return { mode: value.mode as Mode, daily: { ...value.days[0], day: 0 }, weekly: value.days.map((day) => ({ ...day, ranges: [...day.ranges] })) };
}

function buildSchedule(mode: Mode, daily: OpeningDay, weekly: OpeningDay[]): OpeningSchedule {
  if (mode === "unknown") return { status: "unknown" };
  if (mode === "daily") return createDailySchedule({ closed: false, allDay: daily.allDay, ranges: daily.allDay ? [] : daily.ranges });
  return { status: "known", mode: "weekly", days: weekly.map((day) => ({ ...day, ranges: day.closed || day.allDay ? [] : day.ranges })) };
}

/**
 * Nhập giờ mở cửa: "Giống nhau mọi ngày" (mặc định, 1+ khung giờ) · "Chi tiết từng ngày" (mỗi ngày
 * mở theo giờ / 24 giờ / nghỉ, tối đa 3 khung) · "Không rõ giờ" (reviewer bổ sung khi xác minh).
 * Khung có giờ đóng ≤ giờ mở là qua đêm. Validate bằng cùng schema zod với server.
 */
export function OpeningHoursField({ value, onChange, showErrors = false, labelledBy }: OpeningHoursFieldProps) {
  const [state, setState] = useState(() => initialState(value));
  const error = showErrors ? (value ? validateOpeningSchedule(value) : "Nhập giờ mở cửa, hoặc chọn “Không rõ giờ”.") : null;

  function update(next: Partial<typeof state>) {
    const merged = { ...state, ...next };
    setState(merged);
    onChange(buildSchedule(merged.mode, merged.daily, merged.weekly));
  }

  function updateWeekDay(index: number, day: OpeningDay) {
    update({ weekly: state.weekly.map((item, itemIndex) => (itemIndex === index ? day : item)) });
  }

  function copyMondayToAll() {
    const monday = state.weekly[0];
    update({ weekly: state.weekly.map((day) => ({ ...monday, day: day.day, ranges: monday.ranges.map((range) => ({ ...range })) })) });
  }

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelledBy}>
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-background" role="radiogroup" aria-label="Cách nhập giờ mở cửa">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={state.mode === id}
            onClick={() => update({ mode: id })}
            className={cn(
              "flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 min-h-9 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              state.mode === id ? "bg-surface shadow-sm text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {state.mode === "daily" && <DayEditor day={state.daily} allowClosed={false} onChange={(daily) => update({ daily })} />}

      {state.mode === "weekly" && (
        <div className="flex flex-col gap-2">
          {state.weekly.map((day, index) => (
            <div key={day.day} className="flex flex-col gap-2 p-3 rounded-xl border border-border sm:flex-row sm:items-start">
              <span className="w-20 shrink-0 pt-2 text-sm font-semibold text-text-primary">{DAY_NAMES[day.day]}</span>
              <DayEditor day={day} allowClosed onChange={(next) => updateWeekDay(index, next)} />
            </div>
          ))}
          <button
            type="button"
            onClick={copyMondayToAll}
            className="self-start text-xs font-semibold text-primary hover:underline"
          >
            Áp dụng giờ Thứ 2 cho cả tuần
          </button>
        </div>
      )}

      {state.mode === "unknown" && (
        <p className="p-3 rounded-xl bg-background text-sm text-text-secondary">
          Không sao — đề xuất vẫn gửi được, FoodReviewer sẽ bổ sung giờ mở cửa khi đến xác minh.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}

function DayEditor({ day, allowClosed, onChange }: { day: OpeningDay; allowClosed: boolean; onChange: (day: OpeningDay) => void }) {
  const kind: DayKind = day.closed ? "closed" : day.allDay ? "allDay" : "hours";
  const kinds: { id: DayKind; label: string }[] = [
    { id: "hours", label: "Theo giờ" },
    { id: "allDay", label: "Mở 24 giờ" },
    ...(allowClosed ? [{ id: "closed" as const, label: "Nghỉ" }] : []),
  ];

  function setKind(next: DayKind) {
    onChange({
      ...day,
      closed: next === "closed",
      allDay: next === "allDay",
      ranges: next === "hours" ? (day.ranges.length > 0 ? day.ranges : [{ ...EMPTY_RANGE }]) : day.ranges,
    });
  }

  function setRange(index: number, patch: Partial<OpeningRange>) {
    onChange({ ...day, ranges: day.ranges.map((range, rangeIndex) => (rangeIndex === index ? { ...range, ...patch } : range)) });
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={kind === item.id}
            onClick={() => setKind(item.id)}
            className={cn(
              "px-3 min-h-8 rounded-full text-xs font-semibold border transition-colors",
              kind === item.id ? "bg-primary-strong border-primary-strong text-white" : "bg-surface border-border text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {kind === "hours" && (
        <>
          {day.ranges.map((range, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                aria-label={`Giờ mở khung ${index + 1}`}
                value={range.open}
                onChange={(event) => setRange(index, { open: event.target.value })}
                className={timeInputClass}
              />
              <span className="text-text-secondary">–</span>
              <input
                type="time"
                aria-label={`Giờ đóng khung ${index + 1}`}
                value={range.close}
                onChange={(event) => setRange(index, { close: event.target.value })}
                className={timeInputClass}
              />
              {range.open && range.close && range.open !== range.close && isOvernight(range) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-soft px-2 py-0.5 text-[11px] font-semibold text-secondary-strong dark:text-text-primary">
                  <MoonStar className="size-3" aria-hidden />
                  Qua đêm
                </span>
              )}
              {day.ranges.length > 1 && (
                <button
                  type="button"
                  aria-label={`Xoá khung ${index + 1}`}
                  onClick={() => onChange({ ...day, ranges: day.ranges.filter((_, rangeIndex) => rangeIndex !== index) })}
                  className="size-8 rounded-full text-text-secondary hover:bg-background hover:text-text-primary inline-flex items-center justify-center"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
          {day.ranges.length < MAX_RANGES_PER_DAY && (
            <button
              type="button"
              onClick={() => onChange({ ...day, ranges: [...day.ranges, { ...EMPTY_RANGE }] })}
              className="self-start inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="size-3.5" aria-hidden />
              Thêm khung giờ (vd nghỉ trưa)
            </button>
          )}
        </>
      )}
    </div>
  );
}

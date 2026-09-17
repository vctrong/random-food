import { Lightbulb } from "lucide-react";
import type { EatingLevelBreakdownSlice } from "@/features/history-log/historyLogic";

interface HistoryStatsSidebarProps {
  totalCount: number;
  breakdown: EatingLevelBreakdownSlice[];
  topMealTimeInsight: { label: string; percent: number } | null;
}

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HistoryStatsSidebar({
  totalCount,
  breakdown,
  topMealTimeInsight,
}: HistoryStatsSidebarProps) {
  const slicesWithOffset = breakdown.reduce<
    { slice: EatingLevelBreakdownSlice; dashOffset: number }[]
  >((acc, slice) => {
    const cumulativePercent = acc.reduce((sum, item) => sum + item.slice.percent, 0);
    const dashOffset = CIRCUMFERENCE - (cumulativePercent / 100) * CIRCUMFERENCE;
    return [...acc, { slice, dashOffset }];
  }, []);

  return (
    <div className="p-4 rounded-xl bg-white shadow-sm space-y-4">
      <h3 className="font-semibold text-text-primary">Phân bổ theo mức độ đói</h3>

      {totalCount > 0 ? (
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
              {slicesWithOffset.map(({ slice, dashOffset }) => (
                <circle
                  key={slice.eatingLevel}
                  cx="18"
                  cy="18"
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  strokeDasharray={`${(slice.percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-text-primary leading-none">{totalCount}</span>
              <span className="text-xs text-text-secondary">món</span>
            </div>
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            {breakdown.map((slice) => (
              <div key={slice.eatingLevel} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-text-secondary">{slice.label}</span>
                </span>
                <span className="font-semibold text-text-primary">{slice.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Chưa có dữ liệu để thống kê.</p>
      )}

      {topMealTimeInsight && (
        <div className="p-3 rounded-lg bg-soft-blue text-text-secondary text-sm flex items-start gap-2">
          <Lightbulb className="size-4 text-primary-blue shrink-0 mt-0.5" aria-hidden />
          <span>
            {topMealTimeInsight.percent}% lượt random của bạn rơi vào khung giờ{" "}
            <strong className="text-text-primary">{topMealTimeInsight.label.toLowerCase()}</strong>.
          </span>
        </div>
      )}
    </div>
  );
}

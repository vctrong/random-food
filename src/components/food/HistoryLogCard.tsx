import { MapPin, RefreshCw } from "lucide-react";
import type { Food } from "@/types/food";
import type { HistoryEntry } from "@/types/history";
import { HUNGER_LEVELS } from "@/constants/categories";
import { formatClockTime, formatPriceRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface HistoryLogCardProps {
  entry: HistoryEntry;
  food: Food;
}

export function HistoryLogCard({ entry, food }: HistoryLogCardProps) {
  const hungerConfig = HUNGER_LEVELS.find((level) => level.id === entry.hungerLevel);
  const isToday = new Date(entry.timestamp).toDateString() === new Date().toDateString();

  return (
    <div className="p-4 rounded-xl bg-white border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span className="flex items-center gap-1.5">
            <span
              className={
                isToday ? "w-2 h-2 rounded-full bg-success" : "w-2 h-2 rounded-full bg-border"
              }
            />
            {formatClockTime(entry.timestamp)} ({isToday ? "Hôm nay" : "Hôm qua"})
          </span>
          {entry.isSaved && (
            <span className="font-bold text-primary-blue">Đã lưu</span>
          )}
        </div>
        <h4 className="font-semibold text-text-primary">{food.name}</h4>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {hungerConfig && <Badge variant="blue">{hungerConfig.label}</Badge>}
          <span className="text-sm font-semibold text-primary-blue">
            {formatPriceRange(food.priceMin, food.priceMax)}
          </span>
        </div>
      </div>
      <div className="pt-4 mt-2 flex items-center justify-between">
        <span className="text-sm text-text-secondary flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {food.area}
        </span>
        <button
          type="button"
          aria-label="Random lại món này"
          className="w-7 h-7 rounded-full bg-soft-blue flex items-center justify-center text-text-secondary hover:text-primary-blue transition-colors"
        >
          <RefreshCw className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

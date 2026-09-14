import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, RefreshCw, Star, X } from "lucide-react";
import type { HistoryWithFood } from "@/features/history-log/historyLogic";
import { HUNGER_LEVELS } from "@/constants/categories";
import { formatClockTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HistoryTimelineItemProps {
  entry: HistoryWithFood;
  isRemoving: boolean;
  onToggleSaved: (id: string) => void;
  onRemove: (id: string) => void;
}

export function HistoryTimelineItem({
  entry,
  isRemoving,
  onToggleSaved,
  onRemove,
}: HistoryTimelineItemProps) {
  const { food } = entry;
  const hungerConfig = HUNGER_LEVELS.find((level) => level.id === entry.hungerLevel);

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-250 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        isRemoving && "opacity-0 scale-95 pointer-events-none",
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-soft-blue">
          <Image
            src={`https://picsum.photos/seed/${food.imageSeed}/160/160`}
            alt={`Ảnh minh hoạ ${food.name}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatClockTime(entry.timestamp)}
            </span>
            {hungerConfig && (
              <span className="px-2 py-0.5 rounded-full bg-soft-blue text-primary-blue text-xs font-semibold">
                {hungerConfig.label}
              </span>
            )}
            {entry.wasEaten && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">
                <CheckCircle2 className="size-3" aria-hidden />
                Đã ăn món này
              </span>
            )}
          </div>
          <h3 className="font-semibold text-text-primary truncate">{food.name}</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-primary-blue">~{food.priceMin.toLocaleString("vi-VN")}đ</span>
            <span className="text-border">•</span>
            <span className="text-text-secondary truncate">
              {food.restaurantName}, {food.area}
            </span>
          </div>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSaved(entry.id)}
            title={entry.isSaved ? "Đã lưu yêu thích" : "Lưu vào danh sách yêu thích"}
            className={cn(
              "p-2 rounded-full transition-colors",
              entry.isSaved
                ? "text-primary-pink bg-soft-pink"
                : "text-text-secondary hover:text-primary-pink hover:bg-soft-pink",
            )}
          >
            <Star className="size-5" fill={entry.isSaved ? "currentColor" : "none"} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            title="Xoá khỏi lịch sử"
            className="p-2 rounded-full text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <Link
          href={`/random?muc-do=${entry.hungerLevel}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-soft-blue hover:bg-primary-blue hover:text-white text-primary-blue text-sm font-medium transition-colors"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          <span>Random lại món này</span>
        </Link>
      </div>
    </div>
  );
}

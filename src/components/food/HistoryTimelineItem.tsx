import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, RefreshCw, Star, UtensilsCrossed, X } from "lucide-react";
import type { HistoryWithFood } from "@/features/history-log/historyLogic";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
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
  const eatingLevelLabel = entry.eatingLevel ? EATING_LEVEL_LABELS[entry.eatingLevel] : null;
  const coverImage = food.images[0] ?? null;

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-250 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        isRemoving && "opacity-0 scale-95 pointer-events-none",
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-soft-blue">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`Ảnh minh hoạ ${food.name}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-blue">
              <UtensilsCrossed className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatClockTime(entry.timestamp)}
            </span>
            {eatingLevelLabel && (
              <span className="px-2 py-0.5 rounded-full bg-soft-blue text-primary-blue text-xs font-semibold">
                {eatingLevelLabel}
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
            <span className="font-semibold text-primary-blue">
              {food.priceMin !== null ? `~${food.priceMin.toLocaleString("vi-VN")}đ` : "Chưa cập nhật giá"}
            </span>
            <span className="text-border">•</span>
            <span className="text-text-secondary truncate">
              {food.restaurant ? `${food.restaurant.name}, ${food.restaurant.address}` : "Chưa rõ quán"}
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
          href={entry.eatingLevel ? `/random?muc-do=${entry.eatingLevel}` : "/random"}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-soft-blue hover:bg-primary-blue hover:text-white text-primary-blue text-sm font-medium transition-colors"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          <span>Random lại món này</span>
        </Link>
      </div>
    </div>
  );
}

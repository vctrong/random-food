"use client";

import Image from "next/image";
import { Lock, MapPin, UtensilsCrossed } from "lucide-react";
import { cn, formatPriceRange, formatRelativeTime } from "@/lib/utils";
import type { ReviewQueueItem } from "@/types/reviewer";

interface QueueCardProps {
  item: ReviewQueueItem;
  isActive: boolean;
  onSelect: () => void;
}

export function QueueCard({ item, isActive, onSelect }: QueueCardProps) {
  const thumbnail = item.images[0] ?? null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect()}
      className={cn(
        "relative flex flex-col p-4 rounded-2xl bg-white border transition-all cursor-pointer group",
        isActive ? "border-primary-blue shadow-md" : "border-border hover:shadow-sm",
        item.isSelfSubmitted && !isActive && "opacity-80",
      )}
    >
      {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary-blue rounded-r-full" aria-hidden />}
      <div className={cn("flex items-start gap-3", isActive && "pl-2")}>
        <div className="relative size-16 rounded-xl overflow-hidden shrink-0 bg-soft-blue flex items-center justify-center">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="64px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <UtensilsCrossed className="size-6 text-primary-blue/60" aria-hidden />
          )}
          {item.isSelfSubmitted && (
            <div className="absolute inset-0 bg-text-primary/40 flex items-center justify-center">
              <Lock className="size-4 text-white" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary-blue">
              {item.targetType === "food" ? "Món ăn" : "Quán ăn mới"}
            </span>
            <span className="text-[11px] text-text-secondary whitespace-nowrap">{formatRelativeTime(item.createdAt)}</span>
          </div>
          <h3 className="text-sm font-semibold text-text-primary truncate">{item.name}</h3>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{item.address ?? "Chưa có địa chỉ"}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-secondary truncate">
              {item.isSelfSubmitted ? "Gửi bởi: Chính bạn" : `Gửi bởi: ${item.submitter.name}`}
            </span>
            {item.priceMin !== null && item.priceMax !== null && (
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                {formatPriceRange(item.priceMin, item.priceMax)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

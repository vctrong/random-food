"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { reelOffsetPercent } from "@/features/random-food/slotReel";
import { cn } from "@/lib/utils";

interface SlotReelProps {
  title: string;
  icon: LucideIcon;
  strip: string[];
  /** Đổi key mỗi lượt quay để mount dải mới — dải mới bắt đầu bằng đúng nhãn đang hiện nên không giật. */
  spinKey: number;
  durationMs: number;
  iconClassName: string;
}

export function SlotReel({ title, icon: Icon, strip, spinKey, durationMs, iconClassName }: SlotReelProps) {
  const endIndex = strip.length - 2;

  return (
    <div className="flex flex-col min-w-0 rounded-xl bg-surface overflow-hidden">
      <div className="flex items-center justify-center md:justify-start gap-1 px-2 pt-1.5 md:px-3 md:pt-2">
        <Icon className={cn("size-3 shrink-0", iconClassName)} aria-hidden />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-secondary truncate">
          {title}
        </span>
      </div>

      <div className="relative h-[calc(var(--reel-row)*3)] overflow-hidden" aria-hidden>
        <motion.div
          key={spinKey}
          initial={{ y: `${reelOffsetPercent(1, strip.length)}%` }}
          animate={{ y: `${reelOffsetPercent(endIndex, strip.length)}%` }}
          transition={
            durationMs > 0
              ? // Hệ số cuối > 1 tạo cú nảy nhẹ khi cuộn khoá vào ô trúng.
                { duration: durationMs / 1000, ease: [0.16, 0.72, 0.22, 1.04] }
              : { duration: 0 }
          }
          className="will-change-transform"
        >
          {strip.map((label, index) => (
            <div
              key={`${index}-${label}`}
              className="h-(--reel-row) flex items-center justify-center px-1.5 md:px-3"
            >
              <span className="block w-full line-clamp-2 md:line-clamp-1 break-words text-center font-heading font-semibold leading-tight text-sm md:text-[clamp(0.9375rem,2.4svh,1.125rem)] text-text-primary">
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-(--reel-row) bg-gradient-to-b from-surface via-surface/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-(--reel-row) bg-gradient-to-t from-surface via-surface/80 to-transparent" />
      </div>
    </div>
  );
}

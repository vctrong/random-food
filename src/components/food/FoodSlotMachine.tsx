"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Dice5, Keyboard, SearchX, Store, UtensilsCrossed, Wallet } from "lucide-react";
import type { ReelKey } from "@/features/random-food/slotReel";
import { cn } from "@/lib/utils";
import { SlotReel } from "@/components/food/SlotReel";
import { SlotLever } from "@/components/food/SlotLever";

const REELS: { key: ReelKey; title: string; icon: typeof Store; iconClassName: string }[] = [
  { key: "dish", title: "Món", icon: UtensilsCrossed, iconClassName: "text-primary" },
  { key: "place", title: "Quán", icon: Store, iconClassName: "text-accent-ink" },
  { key: "price", title: "Mức giá", icon: Wallet, iconClassName: "text-success" },
];

interface FoodSlotMachineProps {
  strips: Record<ReelKey, string[]>;
  spinKey: number;
  /** Thời lượng quay của từng cuộn (ms), theo thứ tự món → quán → giá. */
  reelDurationsMs: [number, number, number];
  isSpinning: boolean;
  foodCount: number;
  poolSize: number;
  onSpin: () => void;
  onResetFilters: () => void;
}

export function FoodSlotMachine({
  strips,
  spinKey,
  reelDurationsMs,
  isSpinning,
  foodCount,
  poolSize,
  onSpin,
  onResetFilters,
}: FoodSlotMachineProps) {
  const isPoolEmpty = poolSize === 0;
  const canSpin = !isSpinning && !isPoolEmpty;

  return (
    <div className="relative w-full md:pr-14">
      <div className="relative rounded-3xl border-2 border-secondary bg-secondary p-3 sm:p-[clamp(0.75rem,2svh,1.25rem)] shadow-chunky dark:border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[1.25rem] border border-white/15" />

        <div className="relative flex items-center justify-between gap-2 px-1 pb-2.5 sm:pb-3 mb-2.5 sm:mb-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="flex gap-1">
              <span className="size-2 rounded-full bg-warning animate-bulb-blink" />
              <span className="size-2 rounded-full bg-accent animate-bulb-blink [animation-delay:-0.5s]" />
              <span className="size-2 rounded-full bg-primary animate-bulb-blink [animation-delay:-1s]" />
            </span>
            <span className="truncate text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-warning">
              Jackpot ăn uống Cần Thơ
            </span>
          </div>
          <span className="shrink-0 rounded-lg bg-black/30 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-white/85">
            Kho món: {foodCount}
          </span>
        </div>

        <div className="relative grid grid-cols-3 gap-1.5 sm:gap-3 rounded-2xl bg-black/30 p-1.5 sm:p-3">
          {REELS.map((reel, index) => (
            <SlotReel
              key={reel.key}
              title={reel.title}
              icon={reel.icon}
              iconClassName={reel.iconClassName}
              strip={strips[reel.key]}
              spinKey={spinKey}
              durationMs={reelDurationsMs[index]}
            />
          ))}

          {/* Đường trúng thưởng — căn đúng dòng giữa của cửa sổ 3 dòng (bỏ qua hàng tiêu đề cuộn). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-1.5 sm:bottom-3 h-[calc(var(--reel-row)*3)] flex items-center"
          >
            <div className="w-full h-(--reel-row) border-y-2 border-dashed border-accent/80 bg-accent/10 flex items-center justify-between">
              <ChevronRight className="size-4 -ml-1 text-accent-ink" />
              <ChevronLeft className="size-4 -mr-1 text-accent-ink" />
            </div>
          </div>

          {isPoolEmpty && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary/90 p-4 text-center">
              <SearchX className="size-6 text-warning" aria-hidden />
              <p className="text-sm font-semibold text-white">Hiện chưa có món phù hợp bộ lọc này.</p>
              <button
                type="button"
                onClick={onResetFilters}
                className="rounded-full bg-surface px-4 py-1.5 text-xs font-bold text-text-primary transition-transform active:scale-95"
              >
                Bỏ lọc, random tất cả
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 sm:mt-[clamp(0.75rem,2svh,1.25rem)] flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <p className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/75">
            <Keyboard className="size-4" aria-hidden />
            Nhấn <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px] text-white">Space</kbd>
            <span className="hidden md:inline">hoặc kéo cần</span> để random
          </p>
          <button
            type="button"
            onClick={onSpin}
            disabled={!canSpin}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-12 rounded-2xl border-2 border-secondary bg-warning px-8 py-[clamp(0.5rem,1.4svh,0.875rem)] font-heading text-lg font-bold uppercase tracking-wide text-secondary-strong shadow-[0_4px_0_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            <motion.span
              animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
              transition={isSpinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
              className="inline-flex"
            >
              <Dice5 className="size-6" aria-hidden />
            </motion.span>
            {isSpinning ? "Đang quay…" : "Quay ngay!"}
          </button>
        </div>
      </div>

      <SlotLever
        onPull={onSpin}
        disabled={!canSpin}
        className={cn("hidden md:flex absolute right-0 top-1/2 -translate-y-1/2")}
      />
    </div>
  );
}

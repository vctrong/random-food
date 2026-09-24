"use client";

import { MousePointerClick, Soup } from "lucide-react";
import type { EatingLevel } from "@/types/food";
import { EATING_LEVELS } from "@/constants/categories";
import { HUNGER_TITLE_STICKERS } from "@/constants/landingStickers";
import { useLandingRandom } from "@/features/random-food/LandingRandomProvider";
import { cn } from "@/lib/utils";
import { HungerLevelCard } from "@/components/food/HungerLevelCard";
import { FloatingFoodStickers } from "@/components/food/FloatingFoodStickers";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/** Nhãn thước đo "bụng đói" — nhãn UX thuần tuý, thứ tự khớp EATING_LEVELS. */
const GAUGE_LABELS: Record<EatingLevel, string> = {
  snack: "Hơi thèm",
  normal: "Đói vừa",
  hearty: "Khá đói",
  full: "Đói xỉu",
};

function HungerGauge() {
  const { eatingLevel, setEatingLevel } = useLandingRandom();
  const activeIndex = EATING_LEVELS.findIndex((level) => level.id === eatingLevel);
  const hasActive = activeIndex >= 0;

  return (
    <div className="rounded-3xl border border-white/80 bg-linear-to-r from-primary-soft via-surface to-accent-soft p-4 sm:p-5 shadow-[0_12px_30px_-18px_color-mix(in_oklab,var(--color-secondary)_45%,transparent)] dark:border-white/10">
      <div className="mb-4 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <span className="font-bold text-text-primary">Thước đo bụng đói</span>
        <span className="font-semibold text-accent-ink">Càng về phải càng no</span>
      </div>

      {/* overflow-x-clip: lớp trượt rộng 100% dịch sang phải bằng translateX, không được tràn ngang. */}
      <div className="relative overflow-x-clip pt-6">
        <div className="h-3 rounded-full bg-linear-to-r from-primary/35 via-primary/70 to-accent shadow-inner" />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]",
            hasActive ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `translateX(${((Math.max(activeIndex, 0) + 0.5) / EATING_LEVELS.length) * 100}%)` }}
        >
          <span className="absolute left-0 top-0 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-accent-strong text-white shadow-md dark:border-surface">
            <Soup className="size-4.5" aria-hidden />
          </span>
        </div>
      </div>

      <div role="group" aria-label="Chọn mức độ bụng đói" className="mt-2 grid grid-cols-4 gap-1">
        {EATING_LEVELS.map((level) => {
          const isActive = eatingLevel === level.id;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => setEatingLevel(level.id)}
              aria-pressed={isActive}
              aria-label={`${GAUGE_LABELS[level.id]} — ${level.label}`}
              className={cn(
                "rounded-full px-1 py-1.5 text-[11px] sm:text-sm font-bold transition-colors",
                isActive ? "text-accent-ink" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {GAUGE_LABELS[level.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HungerLevelSection() {
  const { eatingLevel, spinWithEatingLevel, isRandomizing } = useLandingRandom();

  return (
    <section aria-labelledby="hunger-title" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <FloatingFoodStickers stickers={HUNGER_TITLE_STICKERS} className="-inset-y-6" />
        <SectionHeading
          id="hunger-title"
          eyebrow="Mức độ bụng đói"
          title="Hôm nay bạn muốn ăn theo gu nào?"
          className="relative z-10"
        />
        <p className="relative z-10 flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
          <MousePointerClick className="size-4 text-accent-ink" aria-hidden />
          Chọn một gu — máy sẽ quay món kiểu đó ngay
        </p>
      </div>

      <Reveal className="mt-8">
        <HungerGauge />
      </Reveal>

      {/* Mobile: cuộn ngang có snap; từ sm trở lên: lưới. pt để sticker "đang chọn" ở góc không bị cắt. */}
      <div className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scrollbar-none px-4 pt-4 pb-6 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {EATING_LEVELS.map((level, index) => (
          <Reveal
            key={level.id}
            delay={index * 0.08}
            className="w-[78%] shrink-0 snap-start sm:w-auto"
          >
            <HungerLevelCard
              config={level}
              index={index}
              isActive={eatingLevel === level.id}
              isBusy={isRandomizing}
              onChoose={() => spinWithEatingLevel(level.id)}
              priority={index === 0}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

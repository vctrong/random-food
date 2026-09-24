"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Sparkles, Wallet } from "lucide-react";
import { EATING_LEVELS } from "@/constants/categories";
import { SLOT_MACHINE_ANCHOR_ID, useLandingRandom } from "@/features/random-food/LandingRandomProvider";
import { cn } from "@/lib/utils";
import { HERO_STICKERS } from "@/constants/landingStickers";
import { FoodSlotMachine } from "@/components/food/FoodSlotMachine";
import { FloatingFoodStickers } from "@/components/food/FloatingFoodStickers";
import { HeroResultCard } from "@/components/food/HeroResultCard";
import { LoginGateModal } from "@/components/auth/LoginGateModal";

/** Chip "Dưới 30k" — ngưỡng giá khởi điểm của món (VNĐ). */
const BUDGET_MAX_PRICE = 30000;

/** Mỗi cuộn dừng lệch nhau để có cảm giác máy slot thật; kết quả chốt sau cuộn cuối. */
const REEL_DURATIONS_MS: [number, number, number] = [1100, 1450, 1800];
const REEL_DURATIONS_REDUCED_MS: [number, number, number] = [0, 0, 0];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)
  );
}

export function HeroSection({ foodCount }: { foodCount: number }) {
  const {
    eatingLevel,
    setEatingLevel,
    maxPrice,
    setMaxPrice,
    currentFood,
    isRandomizing,
    poolSize,
    isSaved,
    isLoginGateOpen,
    closeLoginGate,
    toggleSaved,
    reelState,
    prefersReducedMotion,
    spin,
    resetFilters,
  } = useLandingRandom();

  // Thẻ kết quả hiện đè lên máy sau mỗi lượt quay; bấm "Quay lại máy" thì ẩn cho tới lượt quay sau.
  const [dismissedSpinKey, setDismissedSpinKey] = useState<number | null>(null);
  const showResult = Boolean(currentFood) && !isRandomizing && dismissedSpinKey !== reelState.spinKey;

  // Space chỉ random khi hero đang trong khung nhìn — ở các section bên dưới, Space
  // vẫn cuộn trang như bình thường.
  const sectionRef = useRef<HTMLElement>(null);
  const [isHeroInView, setIsHeroInView] = useState(true);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setIsHeroInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onSpaceKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.code !== "Space" || event.repeat || !isHeroInView || isTypingTarget(event.target)) return;
    if (isLoginGateOpen) return;
    event.preventDefault();
    spin();
  });
  useEffect(() => {
    window.addEventListener("keydown", onSpaceKey);
    return () => window.removeEventListener("keydown", onSpaceKey);
  }, []);

  const chipBase =
    "shrink-0 inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-[transform,background-color,border-color,color] active:scale-95";

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative flex min-h-[calc(100svh-var(--header-h)-var(--dock-h))] flex-col justify-center overflow-hidden bg-dot-grid"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[min(720px,100%)] rounded-full bg-accent-soft blur-3xl opacity-70"
      />

      {/* Điểm hút ≈ tâm máy random; sticker nằm dưới nội dung (z-10). */}
      <FloatingFoodStickers stickers={HERO_STICKERS} agitated={isRandomizing} attractTo={{ x: 50, y: 50 }} />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-[clamp(0.75rem,2.5svh,2.5rem)] md:px-6">
        {/* Ẩn nhãn phụ khi màn hình thấp để máy random lọt trọn 1 màn hình. */}
        <div className="mb-[clamp(0.5rem,1.6svh,1rem)] [@media(max-height:780px)]:hidden inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-surface px-3.5 py-1 text-xs sm:text-sm font-bold text-primary shadow-sm">
          <Sparkles className="size-3.5 text-warning" aria-hidden />
          Không biết ăn gì? Để tụi mình lo.
        </div>

        <h1
          id="hero-title"
          className="max-w-3xl text-center font-heading text-[clamp(1.75rem,min(1.2rem+3vw,6.4svh),3.75rem)] leading-[1.15] tracking-[0.01em] text-text-primary"
        >
          Hôm nay ăn gì? Để{" "}
          <span className="relative inline-block text-accent-ink">
            số phận
            <svg
              aria-hidden
              viewBox="0 0 240 18"
              fill="none"
              preserveAspectRatio="none"
              className="absolute -bottom-1.5 left-0 h-3 w-full md:-bottom-2 md:h-4"
            >
              <path
                d="M4 13C45 5 110 4 236 11C190 14 110 16 35 15"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>{" "}
          quyết định!
        </h1>
        <p className="mt-[clamp(0.5rem,1.6svh,1rem)] max-w-2xl text-balance text-center text-[clamp(0.875rem,min(0.8rem+0.6vw,2.5svh),1.125rem)] text-text-secondary">
          Không cần tranh luận 30 phút. Một lần gạt cần là có ngay bữa ăn chuẩn gu Tây Đô.
        </p>

        <div className="mt-[clamp(0.75rem,2.6svh,2rem)] flex w-full flex-col">
          {/* Mobile: chip nằm TRÊN máy (cuộn ngang); từ sm trở lên: nằm DƯỚI máy như mẫu. */}
          <div
            role="group"
            aria-label="Bộ lọc gu ăn"
            className="order-1 sm:order-2 -mx-4 flex items-center gap-2 overflow-x-auto scroll-px-4 scrollbar-none px-4 pb-3 sm:mx-0 sm:mt-[clamp(0.75rem,2svh,1.25rem)] sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0 md:pr-14"
          >
            <button
              type="button"
              onClick={() => setEatingLevel(null)}
              aria-pressed={eatingLevel === null}
              className={cn(
                chipBase,
                eatingLevel === null
                  ? "border-secondary bg-secondary text-white"
                  : "border-border bg-surface text-text-primary hover:border-secondary",
              )}
            >
              <LayoutGrid className="size-3.5" aria-hidden />
              Tất cả
            </button>
            {EATING_LEVELS.map((level) => {
              const isActive = eatingLevel === level.id;
              const Icon = level.icon;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setEatingLevel(isActive ? null : level.id)}
                  aria-pressed={isActive}
                  className={cn(
                    chipBase,
                    isActive
                      ? "border-secondary bg-primary-strong text-white shadow-chunky-sm"
                      : "border-border bg-surface text-text-primary hover:border-secondary",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {level.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMaxPrice(maxPrice === null ? BUDGET_MAX_PRICE : null)}
              aria-pressed={maxPrice !== null}
              className={cn(
                chipBase,
                maxPrice !== null
                  ? "border-secondary bg-warning text-secondary-strong shadow-chunky-sm"
                  : "border-warning/60 bg-surface text-text-primary hover:border-secondary",
              )}
            >
              <Wallet className="size-3.5" aria-hidden />
              Dưới 30k
            </button>
          </div>

          {/* Máy và thẻ kết quả chồng cùng 1 ô lưới: có kết quả thì thẻ trượt đè lên máy
              (hero không cao thêm); "Quay lại máy" hoặc quay tiếp để hiện lại máy. */}
          <div id={SLOT_MACHINE_ANCHOR_ID} className="order-2 sm:order-1 scroll-mt-24 grid">
            <div
              inert={showResult}
              className={cn(
                "col-start-1 row-start-1 transition-[opacity,transform] duration-300",
                showResult && "scale-[0.98] opacity-20",
              )}
            >
              <FoodSlotMachine
                strips={reelState.strips}
                spinKey={reelState.spinKey}
                reelDurationsMs={prefersReducedMotion ? REEL_DURATIONS_REDUCED_MS : REEL_DURATIONS_MS}
                isSpinning={isRandomizing}
                foodCount={foodCount}
                poolSize={poolSize}
                onSpin={spin}
                onResetFilters={resetFilters}
              />
            </div>

            <AnimatePresence>
              {showResult && currentFood && (
                <motion.div
                  key={`${currentFood.id}-${reelState.spinKey}`}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="z-10 col-start-1 row-start-1 self-center md:pr-14"
                >
                  <HeroResultCard
                    food={currentFood}
                    isSaved={isSaved}
                    isSpinning={isRandomizing}
                    onToggleSave={toggleSaved}
                    onRespin={spin}
                    onBackToMachine={() => setDismissedSpinKey(reelState.spinKey)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="order-3 mt-2.5 text-center text-sm text-text-secondary md:pr-14" aria-live="polite">
            {poolSize > 0 ? `${poolSize} món phù hợp gu bạn chọn` : "Chưa có món phù hợp"}
          </p>
        </div>
      </div>

      <LoginGateModal
        isOpen={isLoginGateOpen}
        onClose={closeLoginGate}
        title="Đăng nhập để lưu món này"
        description="Lưu món yêu thích, xem lại lịch sử ăn uống và nhận gợi ý hợp khẩu vị hơn."
      />
    </section>
  );
}

"use client";

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
  type Variants,
} from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { ONBOARDING_HEADER, ONBOARDING_SLIDES } from "@/constants/onboarding";
import { useOnboardingModal } from "@/features/onboarding/useOnboardingModal";
import { useStrictReducedMotion } from "@/features/random-food/useStrictReducedMotion";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { OnboardingIllustration } from "@/components/onboarding/OnboardingIllustration";

const TITLE_ID = "onboarding-title";
const DESCRIPTION_ID = "onboarding-description";

/** Bottom sheet chỉ có dưới breakpoint `sm` (xem variant "sheet" của Modal). */
const SHEET_QUERY = "(max-width: 639px)";
/** Kéo xuống quá ngưỡng này (px) hoặc vuốt nhanh thì đóng sheet. */
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 600;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** `custom` = hướng chuyển bước (1: Tiếp, -1: Quay lại) + cờ giảm chuyển động. */
interface SlideMotion {
  direction: number;
  reduceMotion: boolean;
}

const contentVariants: Variants = {
  enter: ({ direction, reduceMotion }: SlideMotion) => ({ opacity: 0, x: reduceMotion ? 0 : direction * 28 }),
  center: ({ reduceMotion }: SlideMotion) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.32,
      ease: EASE_OUT,
      staggerChildren: reduceMotion ? 0 : 0.06,
      delayChildren: reduceMotion ? 0 : 0.06,
    },
  }),
  exit: ({ direction, reduceMotion }: SlideMotion) => ({
    opacity: 0,
    x: reduceMotion ? 0 : direction * -28,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  }),
};

const itemVariants: Variants = {
  enter: ({ reduceMotion }: SlideMotion) => ({ opacity: 0, y: reduceMotion ? 0 : 8 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

export function OnboardingModal() {
  const { isOpen, close, snooze } = useOnboardingModal();
  const reduceMotion = useStrictReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const sheetY = useMotionValue(0);

  const slide = ONBOARDING_SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const motionCustom: SlideMotion = { direction, reduceMotion };

  useEffect(() => {
    if (isOpen) sheetY.set(0);
  }, [isOpen, sheetY]);

  function goTo(next: number) {
    if (next < 0 || next >= ONBOARDING_SLIDES.length || next === index) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    bodyRef.current?.scrollTo({ top: 0 });
  }

  // Phím ←/→ để chuyển bước (Esc/Tab do Modal xử lý).
  const onArrowKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  });
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", onArrowKey);
    return () => window.removeEventListener("keydown", onArrowKey);
  }, [isOpen]);

  function startSheetDrag(event: ReactPointerEvent) {
    if (!window.matchMedia(SHEET_QUERY).matches) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    dragControls.start(event);
  }

  function handleSheetDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      // Giữ nguyên độ lệch hiện tại — Modal trượt cả panel xuống tiếp từ đó.
      close();
      return;
    }
    animate(sheetY, 0, { type: "spring", stiffness: 420, damping: 38 });
  }

  const PrimaryIcon = isLast ? Sparkles : ArrowRight;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      variant="sheet"
      bare
      showCloseButton={false}
      labelledBy={TITLE_ID}
      describedBy={DESCRIPTION_ID}
      overlayClassName="bg-text-primary/35 dark:bg-background/70"
      panelClassName="sm:max-w-[880px]"
    >
      <motion.div
        style={{ y: sheetY }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        dragMomentum={false}
        onDragEnd={handleSheetDragEnd}
        className="shadow-dreamy relative flex max-h-[92svh] flex-col overflow-hidden rounded-t-[28px] bg-surface/[0.97] backdrop-blur-xl sm:max-h-[min(90svh,680px)] sm:rounded-[28px]"
      >
        <span aria-hidden className="dreamy-hairline" />

        {/* HEADER */}
        <div className="shrink-0 touch-none sm:touch-auto" onPointerDown={startSheetDrag}>
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-text-secondary/30 sm:hidden" />
          <div className="flex items-center gap-3 px-5 pt-3 pb-4 sm:px-7 sm:pt-6 sm:pb-5">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft ring-1 ring-primary-line sm:size-11">
              <span className="relative size-7 sm:size-8">
                <Image src={BRAND.mascot} alt="" fill sizes="32px" className="object-contain" />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={TITLE_ID} className="text-h3 truncate text-text-primary">
                {ONBOARDING_HEADER.title}
              </h2>
              <p id={DESCRIPTION_ID} className="truncate text-sm text-text-secondary">
                {ONBOARDING_HEADER.subtitle}
              </p>
            </div>
            <p aria-live="polite" className="shrink-0 text-xs font-semibold text-text-secondary tabular-nums">
              <span className="sr-only">Đang ở </span>Bước {index + 1}/{ONBOARDING_SLIDES.length}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng hướng dẫn"
              className="group flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70 text-text-secondary backdrop-blur-md transition-colors duration-200 hover:bg-primary-soft hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-[18px] transition-transform duration-300 ease-out group-hover:rotate-90" aria-hidden />
            </button>
          </div>
          <div aria-hidden className="mx-5 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:mx-7" />
        </div>

        {/* BODY — cuộn riêng, header/footer đứng yên */}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-5 px-5 pt-4 pb-5 sm:px-7 sm:pt-6 sm:pb-6 md:grid-cols-[45fr_55fr] md:items-stretch md:gap-8">
            <OnboardingIllustration
              slide={slide}
              direction={direction}
              reduceMotion={reduceMotion}
              className="h-36 sm:h-48 md:h-auto md:min-h-[340px]"
            />

            <div className="relative overflow-hidden md:py-2">
              <AnimatePresence mode="wait" initial={false} custom={motionCustom}>
                <motion.div
                  key={slide.id}
                  custom={motionCustom}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <motion.h3 custom={motionCustom} variants={itemVariants} className="text-h2 text-text-primary">
                    {slide.title}
                  </motion.h3>
                  <motion.p
                    custom={motionCustom}
                    variants={itemVariants}
                    className="mt-1.5 text-sm leading-relaxed text-text-secondary sm:text-[15px]"
                  >
                    {slide.description}
                  </motion.p>

                  <ol className="mt-5 flex flex-col gap-4 sm:mt-6 sm:gap-5">
                    {slide.steps.map((step, stepIndex) => {
                      const StepIcon = step.icon;
                      return (
                        <motion.li
                          key={step.title}
                          custom={motionCustom}
                          variants={itemVariants}
                          className="relative flex items-start gap-3.5"
                        >
                          {stepIndex < slide.steps.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute top-11 bottom-[-1rem] left-5 w-px bg-gradient-to-b from-primary-line to-transparent sm:bottom-[-1.25rem]"
                            />
                          )}
                          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-primary-line/80">
                            <StepIcon className="size-[18px]" strokeWidth={2} aria-hidden />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-[15px] font-bold text-text-primary">
                              <span className="sr-only">Bước {stepIndex + 1}: </span>
                              {step.title}
                            </p>
                            <p className="text-sm leading-relaxed text-text-secondary">{step.text}</p>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ol>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* FOOTER — luôn ở đáy modal */}
        <div className="shrink-0">
          <div aria-hidden className="mx-5 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:mx-7" />
          <div className="flex flex-col gap-3 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
            <div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-5">
              <div className="flex items-center" role="group" aria-label="Chọn bước hướng dẫn">
                {ONBOARDING_SLIDES.map((item, dotIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(dotIndex)}
                    aria-label={`Bước ${dotIndex + 1}: ${item.title}`}
                    aria-current={dotIndex === index ? "step" : undefined}
                    className="group flex h-9 items-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span
                      className={cn(
                        "relative block h-1.5 overflow-hidden rounded-full bg-border transition-[width] duration-300 ease-out group-hover:bg-primary-line",
                        dotIndex === index ? "w-9" : "w-5",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute inset-0 origin-left rounded-full bg-gradient-to-r from-primary to-accent transition-transform duration-500 ease-out",
                          dotIndex <= index ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={snooze}
                className="group relative py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Ẩn trong 24 giờ
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1.5 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
                />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-[15px] font-semibold text-text-secondary transition-colors duration-200 hover:border-primary-line hover:bg-primary-soft hover:text-text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5"
                >
                  <ArrowLeft
                    className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  Quay lại
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? close : () => goTo(index + 1)}
                className="bg-cta-dreamy shadow-cta-dreamy hover:shadow-cta-dreamy-strong group relative isolate inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[15px] font-bold text-white transition-[translate,scale,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:flex-none"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-2/5 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 group-hover:animate-[shimmer-sweep_0.85s_ease-out_forwards] group-hover:opacity-100"
                />
                {isLast ? "Bắt đầu thôi" : "Tiếp theo"}
                <PrimaryIcon
                  className={cn(
                    "size-[18px] transition-transform duration-200 ease-out",
                    isLast ? "group-hover:rotate-12 group-hover:scale-110" : "group-hover:translate-x-1",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
}

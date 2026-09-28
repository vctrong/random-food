"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, Dices, MapPin } from "lucide-react";
import type { OnboardingSlide } from "@/constants/onboarding";
import { cn } from "@/lib/utils";

const SPARKLES = [
  { x: 30, y: 16, size: 10, delay: "0s", tone: "text-accent" },
  { x: 70, y: 34, size: 8, delay: "-0.9s", tone: "text-primary" },
  { x: 26, y: 62, size: 7, delay: "-1.6s", tone: "text-primary" },
  { x: 66, y: 84, size: 9, delay: "-0.4s", tone: "text-accent" },
];

function SparkleStar({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 0c.9 7.4 4.6 11.1 12 12-7.4.9-11.1 4.6-12 12-.9-7.4-4.6-11.1-12-12C7.4 11.1 11.1 7.4 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RandomCenter() {
  return (
    <div className="relative flex size-24 items-center justify-center rounded-full bg-surface/80 shadow-[0_18px_40px_-18px_var(--color-primary)] ring-8 ring-surface/40 md:size-36">
      <div className="absolute inset-3 rounded-full border border-dashed border-primary-line md:inset-4" />
      <Dices className="size-10 text-primary md:size-14" strokeWidth={1.6} aria-hidden />
    </div>
  );
}

function ContributeCenter() {
  return (
    <div className="w-36 rounded-2xl bg-surface/85 p-3 shadow-[0_18px_40px_-18px_var(--color-accent-strong)] ring-1 ring-accent/50 md:w-48 md:p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink md:size-10">
          <ChefHat className="size-4 md:size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-4/5 rounded-full bg-text-secondary/25" />
          <div className="h-2 w-1/2 rounded-full bg-text-secondary/15" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary-soft px-2 py-1.5 md:mt-4">
        <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
        <div className="h-1.5 flex-1 rounded-full bg-primary-line" />
      </div>
    </div>
  );
}

interface OnboardingIllustrationProps {
  slide: OnboardingSlide;
  /** 1: Tiếp, -1: Quay lại. */
  direction: number;
  reduceMotion: boolean;
  className?: string;
}

/**
 * Vùng minh hoạ của modal hướng dẫn. Lớp nền (mesh, blob, hạt lấp lánh) đứng yên
 * giữa các bước; chỉ lớp món ăn + hình trung tâm crossfade khi đổi bước. Vòng lặp
 * idle là CSS animation nên tự tắt theo rule giảm chuyển động trong globals.css.
 */
export function OnboardingIllustration({ slide, direction, reduceMotion, className }: OnboardingIllustrationProps) {
  const shift = reduceMotion ? 0 : direction * 18;

  return (
    <div aria-hidden className={cn("bg-dreamy-mesh relative isolate overflow-hidden rounded-[20px]", className)}>
      <div className="absolute -left-10 -top-12 size-44 rounded-full bg-primary/25 blur-3xl animate-blob-float" />
      <div
        className="absolute -right-12 top-1/3 size-48 rounded-full bg-accent/30 blur-3xl animate-blob-float"
        style={{ animationDuration: "15s", animationDelay: "-4s" }}
      />
      <div
        className="absolute -bottom-16 left-1/4 size-40 rounded-full bg-primary/15 blur-3xl animate-blob-float"
        style={{ animationDuration: "18s", animationDelay: "-9s" }}
      />

      {SPARKLES.map((sparkle) => (
        <span
          key={`${sparkle.x}-${sparkle.y}`}
          className={cn("absolute animate-twinkle", sparkle.tone)}
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDuration: "3.2s",
            animationDelay: sparkle.delay,
          }}
        >
          <SparkleStar size={sparkle.size} />
        </span>
      ))}

      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          className="absolute inset-0"
          initial={{ opacity: 0, x: shift, scale: reduceMotion ? 1 : 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, x: -shift, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
        >
          {slide.stickers.map((sticker) => (
            <span
              key={sticker.emoji}
              className="absolute -translate-x-1/2 -translate-y-1/2 select-none leading-none drop-shadow-sm"
              style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, rotate: `${sticker.rotate}deg` }}
            >
              <span
                className="block animate-sticker-float text-[length:calc(var(--sz)*0.68)] md:text-[length:var(--sz)]"
                style={
                  {
                    "--sz": `${sticker.size}rem`,
                    "--float-y": "7px",
                    "--float-rot": "4deg",
                    "--float-duration": `${sticker.duration}s`,
                    "--float-delay": `${sticker.delay}s`,
                  } as CSSProperties
                }
              >
                {sticker.emoji}
              </span>
            </span>
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="animate-sticker-float"
              style={
                {
                  "--float-y": "6px",
                  "--float-rot": "0deg",
                  "--float-duration": "6s",
                } as CSSProperties
              }
            >
              {slide.id === "random" ? <RandomCenter /> : <ContributeCenter />}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

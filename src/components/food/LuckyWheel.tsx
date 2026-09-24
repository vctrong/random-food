"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import type { EatingLevel } from "@/types/food";
import { EATING_LEVELS } from "@/constants/categories";
import { useLandingRandom } from "@/features/random-food/LandingRandomProvider";
import { wheelTargetRotation } from "@/features/random-food/luckyWheel";

/** Màu lát theo mức độ — trùng thước đo bụng đói, chỉ dùng token trong bảng màu. */
const SLICE_FILL: Record<EatingLevel, string> = {
  snack: "var(--color-success)",
  normal: "var(--color-primary)",
  hearty: "var(--color-warning)",
  full: "var(--color-accent)",
};

const RADIUS = 100;
const LABEL_RADIUS = 62;
const FULL_TURNS = 5;
const SPIN_SECONDS = 3.2;

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

function slicePath(startDeg: number, endDeg: number) {
  const start = polar(startDeg, RADIUS);
  const end = polar(endDeg, RADIUS);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M0 0 L${start.x} ${start.y} A${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

/**
 * Vòng quay chọn NGẪU NHIÊN mức độ ăn — dừng ở lát nào thì máy random ở hero đặt
 * bộ lọc mức đó và quay luôn. Chỉ animate transform (rotate).
 */
export function LuckyWheel() {
  const { spinWithEatingLevel, isRandomizing, prefersReducedMotion } = useLandingRandom();
  const [rotation, setRotation] = useState(0);
  const [pendingLevel, setPendingLevel] = useState<EatingLevel | null>(null);
  const sliceDeg = 360 / EATING_LEVELS.length;

  function handleSpin() {
    if (pendingLevel || isRandomizing) return;
    const targetIndex = Math.floor(Math.random() * EATING_LEVELS.length);
    setPendingLevel(EATING_LEVELS[targetIndex].id);
    setRotation((current) => wheelTargetRotation(current, targetIndex, EATING_LEVELS.length, FULL_TURNS));
  }

  function handleSpinComplete() {
    if (!pendingLevel) return;
    const level = pendingLevel;
    setPendingLevel(null);
    spinWithEatingLevel(level);
  }

  const isSpinning = pendingLevel !== null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-60 sm:size-72">
        <motion.svg
          viewBox="-104 -104 208 208"
          role="img"
          aria-label="Vòng quay chọn ngẫu nhiên mức độ ăn"
          animate={{ rotate: rotation }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: SPIN_SECONDS, ease: [0.12, 0.8, 0.2, 1] }
          }
          onAnimationComplete={handleSpinComplete}
          className="size-full drop-shadow-md"
        >
          <circle r={RADIUS + 3} fill="var(--color-secondary)" />
          {EATING_LEVELS.map((level, index) => {
            const start = index * sliceDeg;
            const mid = start + sliceDeg / 2;
            return (
              <g key={level.id}>
                <path d={slicePath(start, start + sliceDeg)} fill={SLICE_FILL[level.id]} stroke="var(--color-secondary)" strokeWidth={1.5} />
                <text
                  // Lát nửa dưới lật thêm 180° để chữ không bị ngược khi vòng đứng yên.
                  transform={`rotate(${mid}) translate(0 ${-LABEL_RADIUS})${mid > 90 && mid < 270 ? " rotate(180)" : ""}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-heading"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--color-secondary)"
                >
                  {level.label}
                </text>
              </g>
            );
          })}
          <circle r={26} fill="var(--color-surface)" stroke="var(--color-secondary)" strokeWidth={3} />
        </motion.svg>

        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center font-heading text-[10px] sm:text-xs font-bold leading-tight text-text-primary">
          <span>VÒNG</span>
          <span className="text-accent-ink">QUAY</span>
        </span>

        {/* Kim chỉ đứng yên ở đỉnh. */}
        <svg viewBox="0 0 24 28" aria-hidden className="absolute -top-3 left-1/2 w-6 -translate-x-1/2 drop-shadow">
          <path d="M12 27 L2 6 A10 10 0 1 1 22 6 Z" fill="var(--color-accent)" stroke="var(--color-secondary)" strokeWidth={2} />
        </svg>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={isSpinning || isRandomizing}
        className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-secondary bg-secondary px-6 py-2.5 text-sm font-bold text-white shadow-chunky-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-70 dark:border-white/20"
      >
        <Shuffle className="size-4" aria-hidden />
        {isSpinning ? "Đang quay…" : "Thử một vòng may mắn!"}
      </button>
      <p className="mt-2 text-center text-xs text-text-secondary">
        Vòng quay chọn mức độ ăn, máy ở trên chọn món.
      </p>
    </div>
  );
}

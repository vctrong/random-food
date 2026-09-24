"use client";

import { useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/** Quãng kéo tối đa của núm cần (px) và ngưỡng kéo tính là "gạt". */
const PULL_DISTANCE = 72;
const PULL_THRESHOLD = 44;
const STEM_HEIGHT = 96;

interface SlotLeverProps {
  onPull: () => void;
  disabled: boolean;
  className?: string;
}

/**
 * Cần gạt bên hông máy random: kéo núm xuống quá ngưỡng rồi thả để quay, hoặc
 * bấm/Enter trên núm. Chỉ đổi transform (translateY núm + scaleY thân cần).
 */
export function SlotLever({ onPull, disabled, className }: SlotLeverProps) {
  const knobY = useMotionValue(0);
  const stemScale = useTransform(knobY, [0, STEM_HEIGHT], [1, 0], { clamp: true });
  // Trình duyệt vẫn bắn click sau khi thả kéo — bỏ qua click đó để không gạt 2 lần.
  const justDraggedRef = useRef(false);

  function handleClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (disabled) return;
    animate(knobY, [0, PULL_DISTANCE, 0], { duration: 0.55, times: [0, 0.4, 1], ease: "easeInOut" });
    onPull();
  }

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div className="relative flex flex-col items-center" style={{ height: STEM_HEIGHT + 28 }}>
        <motion.button
          type="button"
          aria-label="Gạt cần để random món"
          disabled={disabled}
          drag={disabled ? false : "y"}
          dragConstraints={{ top: 0, bottom: PULL_DISTANCE }}
          dragElastic={0.08}
          dragSnapToOrigin
          dragMomentum={false}
          onDragStart={() => {
            justDraggedRef.current = true;
          }}
          onDragEnd={() => {
            if (knobY.get() >= PULL_THRESHOLD) onPull();
          }}
          onClick={handleClick}
          style={{ y: knobY }}
          whileHover={disabled ? undefined : { scale: 1.06 }}
          className="relative z-10 size-13 shrink-0 rounded-full bg-accent border-2 border-secondary shadow-chunky-sm flex items-center justify-center cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
        >
          <span className="text-[10px] font-extrabold tracking-wider text-secondary-strong">KÉO</span>
        </motion.button>
        <motion.div
          style={{ scaleY: stemScale, height: STEM_HEIGHT }}
          className="-mt-3 w-3.5 origin-bottom rounded-full bg-border border-2 border-secondary"
        />
      </div>
      <div className="-mt-1 -ml-1 self-start w-10 h-12 rounded-r-xl bg-border border-2 border-l-0 border-secondary" />
    </div>
  );
}

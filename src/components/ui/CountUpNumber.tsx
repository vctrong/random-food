"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const COUNT_UP_MS = 1200;

/** Đếm 0 → target khi active; hiện số ngay nếu reduced-motion. */
function useCountUp(target: number, active: boolean, reduceMotion: boolean) {
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      // Đồng bộ thẳng giá trị cuối khi user bật reduced-motion — không có animation
      // frame nào theo sau nên không tạo cascading render như hiệu ứng đếm bên dưới.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, reduceMotion]);

  return value;
}

interface CountUpNumberProps {
  target: number;
  /** Bắt đầu đếm khi true (thường là "đã lọt vào viewport"). */
  active: boolean;
  suffix?: string;
  className?: string;
}

export function CountUpNumber({ target, active, suffix = "", className }: CountUpNumberProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const value = useCountUp(target, active, reduceMotion);
  return (
    <p className={className}>
      {new Intl.NumberFormat("vi-VN").format(value)}
      {suffix}
    </p>
  );
}

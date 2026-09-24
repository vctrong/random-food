"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Thẻ bọc ngoài — "li" khi đặt trực tiếp trong <ol>/<ul>. */
  as?: "div" | "li";
}

/** Fade + trượt nhẹ lên khi phần tử lọt vào khung nhìn, chỉ chạy 1 lần. Reduced-motion do MotionConfig ở layout lo. */
export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}

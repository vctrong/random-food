import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "blue" | "pink" | "neutral" | "success" | "warning" | "dark";

const VARIANT_CLASSES: Record<Variant, string> = {
  blue: "bg-primary-soft text-primary",
  pink: "bg-accent-soft text-accent-ink",
  neutral: "bg-black/5 text-text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-[#92720f]",
  dark: "bg-text-primary text-white",
};

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

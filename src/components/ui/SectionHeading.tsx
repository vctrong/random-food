import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EyebrowTone = "blue" | "pink" | "warning" | "success";

const EYEBROW_TONES: Record<EyebrowTone, string> = {
  blue: "bg-primary-soft text-primary border-primary/30",
  pink: "bg-accent-soft text-accent-ink border-accent/30",
  warning: "bg-warning/15 text-text-primary border-warning/60",
  success: "bg-success/10 text-success border-success/30",
};

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: EyebrowTone;
  align?: "left" | "center";
  id?: string;
  className?: string;
}

/** Nhãn nhỏ dạng pill + tiêu đề section landing (Fredoka One qua .text-display-sm). */
export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "blue",
  align = "left",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-2xl text-center", className)}>
      <span
        className={cn(
          "inline-block rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest",
          EYEBROW_TONES[tone],
        )}
      >
        {eyebrow}
      </span>
      <h2 id={id} className="text-display-sm mt-3 text-balance text-text-primary">
        {title}
      </h2>
      {description && <p className="mt-2 text-sm md:text-base text-text-secondary">{description}</p>}
    </div>
  );
}

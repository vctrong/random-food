import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-border shadow-sm",
        hoverable &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
      {...rest}
    />
  );
}

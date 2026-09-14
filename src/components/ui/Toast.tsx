"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  const isVisible = Boolean(message);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-[60] flex items-center gap-2 px-4 py-3 rounded-xl bg-text-primary text-white shadow-2xl transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <CheckCircle2 className="size-5 text-primary-blue shrink-0" aria-hidden />
      <span className="text-sm">{message}</span>
    </div>
  );
}

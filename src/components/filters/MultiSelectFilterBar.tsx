"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface MultiFilterOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface MultiSelectFilterBarProps {
  options: MultiFilterOption[];
  values: string[];
  onToggle: (id: string) => void;
  className?: string;
}

export function MultiSelectFilterBar({ options, values, onToggle, className }: MultiSelectFilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option) => {
        const isActive = values.includes(option.id);
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium shadow-sm transition-all active:scale-95",
              isActive
                ? "bg-primary-strong text-white shadow-[0_4px_12px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]"
                : "bg-surface text-text-secondary hover:text-text-primary hover:shadow-md",
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

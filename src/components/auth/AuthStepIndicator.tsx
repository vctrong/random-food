import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthStepIndicatorProps {
  steps: readonly string[];
  /** Chỉ số bước đang làm (0-based); = steps.length nghĩa là đã xong hết. */
  current: number;
}

export function AuthStepIndicator({ steps, current }: AuthStepIndicatorProps) {
  const progress = Math.min(current, steps.length - 1) / (steps.length - 1);
  return (
    <nav aria-label="Tiến trình đặt lại mật khẩu" className="mb-7">
      <ol className="relative flex items-start justify-between">
        <div aria-hidden className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-border" />
        <div
          aria-hidden
          className="absolute left-4 top-4 h-0.5 rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `calc((100% - 2rem) * ${progress})` }}
        />
        {steps.map((label, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className="relative z-10 flex w-20 flex-col items-center gap-1.5 text-center"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 text-sm font-bold transition-colors duration-300",
                  isDone && "border-primary-strong bg-primary-strong text-white",
                  isCurrent && "border-primary bg-primary-soft text-primary-strong dark:text-primary",
                  !isDone && !isCurrent && "border-border bg-surface text-text-secondary",
                )}
              >
                {isDone ? <Check className="size-4" aria-hidden /> : index + 1}
              </span>
              <span className={cn("text-xs font-medium", isCurrent ? "text-text-primary" : "text-text-secondary")}>
                {label}
                {isDone && <span className="sr-only"> (đã xong)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

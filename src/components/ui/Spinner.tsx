import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = "Đang tải" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-10 rounded-full border-4 border-primary-soft border-t-primary border-r-accent animate-spin",
        className,
      )}
    />
  );
}

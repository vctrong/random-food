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
        "inline-block size-10 rounded-full border-4 border-soft-blue border-t-primary-blue border-r-primary-pink animate-spin",
        className,
      )}
    />
  );
}

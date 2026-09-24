import Image from "next/image";
import { BRAND } from "@/constants/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Ẩn wordmark (vd navbar khi cuộn) — chỉ đổi opacity/transform nên không giật layout. */
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
  mascotClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}

/** Linh vật (nền trong suốt) + chữ "Nay Ăn Gì?" bằng Fredoka — dùng ở navbar và menu mobile. */
export function BrandMark({
  compact = false,
  showTagline = false,
  className,
  mascotClassName,
  wordmarkClassName,
  priority,
}: BrandMarkProps) {
  return (
    <span className={cn("group/brand flex items-center gap-2", className)}>
      <span
        className={cn(
          "relative size-11 shrink-0 transition-transform duration-300 group-hover/brand:-rotate-6",
          compact && "scale-90",
          mascotClassName,
        )}
      >
        <Image
          src={BRAND.mascot}
          alt=""
          fill
          sizes="48px"
          priority={priority}
          className="object-contain drop-shadow-[0_2px_4px_color-mix(in_oklab,var(--color-primary)_35%,transparent)]"
        />
      </span>
      <span
        className={cn(
          "flex flex-col leading-none transition-[opacity,transform] duration-300",
          compact && "pointer-events-none -translate-x-2 opacity-0",
          wordmarkClassName,
        )}
      >
        <span className="font-heading text-lg text-text-primary whitespace-nowrap">
          Nay Ăn <span className="text-primary">Gì?</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[10px] font-semibold tracking-wide text-text-secondary whitespace-nowrap">
            {BRAND.tagline}
          </span>
        )}
      </span>
      <span className="sr-only">{BRAND.name} — về trang chủ</span>
    </span>
  );
}

"use client";

import { useRef, type PointerEvent } from "react";
import Image from "next/image";
import { ArrowRight, Dice5, Flame, Sparkles } from "lucide-react";
import type { EatingLevel } from "@/types/food";
import type { EatingLevelConfig } from "@/constants/categories";
import { useStrictReducedMotion } from "@/features/random-food/useStrictReducedMotion";
import { cn } from "@/lib/utils";

/** Góc nghiêng tối đa (deg) khi tilt theo chuột. */
const MAX_TILT = 7;

/** Tông pastel riêng từng gu — chỉ phối từ token màu thương hiệu (xanh–hồng–kem). */
const LEVEL_THEME: Record<
  EatingLevel,
  { card: string; dots: string; pill: string; button: string; sticker: string }
> = {
  snack: {
    card: "from-primary-soft to-surface",
    dots: "text-primary/30",
    pill: "bg-primary-soft text-primary border-primary/25",
    button: "bg-primary/12 text-primary hover:bg-primary-strong hover:text-white",
    sticker: "🍡",
  },
  normal: {
    card: "from-accent-soft via-surface to-primary-soft",
    dots: "text-accent-ink/30",
    pill: "bg-accent-soft text-accent-ink border-accent/25",
    button: "bg-accent/12 text-accent-ink hover:bg-accent-strong hover:text-white",
    sticker: "🍚",
  },
  hearty: {
    card: "from-warning/15 via-background to-accent-soft",
    dots: "text-warning/60",
    pill: "bg-warning/20 text-secondary-strong border-warning/50 dark:text-warning",
    button: "bg-primary/12 text-primary hover:bg-primary-strong hover:text-white",
    sticker: "🍜",
  },
  full: {
    card: "from-accent-soft to-accent/15",
    dots: "text-accent-ink/35",
    pill: "bg-surface/80 text-accent-ink border-accent/30",
    button: "bg-accent/12 text-accent-ink hover:bg-accent-strong hover:text-white",
    sticker: "🍲",
  },
};

interface HungerLevelCardProps {
  config: EatingLevelConfig;
  /** Thứ tự card — card chẵn/lẻ nghiêng ảnh polaroid ngược chiều nhau. */
  index: number;
  isActive: boolean;
  /** Máy đang quay — khoá nút để không bấm chồng. */
  isBusy: boolean;
  onChoose: () => void;
  priority?: boolean;
}

export function HungerLevelCard({ config, index, isActive, isBusy, onChoose, priority = false }: HungerLevelCardProps) {
  const theme = LEVEL_THEME[config.id];
  const cardRef = useRef<HTMLElement>(null);
  const reducedMotion = useStrictReducedMotion();

  // Tilt ghi thẳng vào biến CSS — không setState mỗi lần di chuột.
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const node = cardRef.current;
    if (!node || reducedMotion || event.pointerType !== "mouse") return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--rx", `${(-py * MAX_TILT * 2).toFixed(2)}deg`);
    node.style.setProperty("--ry", `${(px * MAX_TILT * 2).toFixed(2)}deg`);
  };
  const resetTilt = () => {
    cardRef.current?.style.setProperty("--rx", "0deg");
    cardRef.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <article
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={{
        transform:
          "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(var(--lift, 0px))",
      }}
      className={cn(
        "group relative flex h-full flex-col rounded-[1.75rem] border bg-linear-to-br p-3 transition-[transform,box-shadow] duration-300 ease-out",
        "hover:[--lift:-6px]",
        theme.card,
        isActive
          ? "border-white shadow-[0_0_0_3px_var(--color-accent),0_0_32px_-4px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] dark:border-surface"
          : "border-white/80 shadow-[0_14px_32px_-16px_color-mix(in_oklab,var(--color-secondary)_40%,transparent)] hover:shadow-[0_22px_40px_-18px_color-mix(in_oklab,var(--color-secondary)_50%,transparent)] dark:border-white/10",
      )}
    >
      {/* Chấm bi góc trên phải, mờ dần về phía giữa card. */}
      <span
        aria-hidden
        className={cn(
          "bg-polka pointer-events-none absolute top-0 right-0 h-24 w-28 rounded-tr-[1.75rem]",
          theme.dots,
        )}
        style={{ maskImage: "radial-gradient(circle at top right, black 20%, transparent 72%)" }}
      />

      {isActive && (
        <span className="absolute -top-3 -right-2 z-20 inline-flex rotate-6 items-center gap-1 rounded-full border-2 border-white bg-accent-strong px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md dark:border-surface">
          <Sparkles className="size-3" aria-hidden />
          Đang chọn
        </span>
      )}

      {/* Ảnh kiểu polaroid nghiêng nhẹ, phủ gradient pastel để hoà vào tông card. */}
      <div
        className={cn(
          "relative rounded-2xl bg-surface p-2 pb-3 shadow-sm transition-transform duration-500 group-hover:rotate-0",
          index % 2 === 0 ? "-rotate-2" : "rotate-2",
        )}
      >
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-primary-soft">
          <Image
            src={config.imageUrl}
            alt={`Ảnh minh hoạ nhóm món ${config.label.toLowerCase()}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw"
            priority={priority}
            className="object-cover brightness-110 contrast-90 saturate-90 transition-transform duration-500 group-hover:scale-105"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-br from-accent/20 via-transparent to-primary/25"
          />
          <span aria-hidden className="absolute bottom-2 left-2 text-2xl drop-shadow-md">
            {theme.sticker}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", theme.pill)}>
            {config.badge}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-ink">
            <Flame className="size-3" aria-hidden />
            {config.kcalRange}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-2 pt-4 pb-1">
        <h3 className="font-heading text-2xl leading-tight text-text-primary">{config.label}</h3>
        <p className="mt-1 text-sm font-bold text-primary">{config.tagline}</p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">{config.description}</p>

        <button
          type="button"
          onClick={onChoose}
          disabled={isBusy}
          className={cn(
            "mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-[background-color,color,transform] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70",
            isActive ? "bg-accent-strong text-white" : theme.button,
          )}
        >
          {isActive ? (
            <>
              <Dice5 className="size-4" aria-hidden />
              Quay lại món kiểu này
            </>
          ) : (
            <>
              Chọn {config.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

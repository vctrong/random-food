import Link from "next/link";
import { ArrowRight, Dices, Sparkles } from "lucide-react";
import type { EatingLevel } from "@/types/food";
import { EATING_LEVELS } from "@/constants/categories";
import { cn } from "@/lib/utils";

const LEVEL_TONES: Record<EatingLevel, { card: string; icon: string; title: string }> = {
  snack: { card: "bg-accent-soft border-accent/50", icon: "text-accent-ink", title: "text-accent-ink" },
  normal: { card: "bg-primary-soft border-primary/40", icon: "text-primary", title: "text-primary-strong dark:text-primary" },
  hearty: { card: "bg-warning/10 border-warning/50", icon: "text-secondary", title: "text-secondary-strong dark:text-warning" },
  full: { card: "bg-secondary-soft border-secondary/30", icon: "text-secondary", title: "text-secondary-strong dark:text-text-primary" },
};

/** Mega menu "Món ăn": 4 mức ăn thật (constants/categories — nội dung theo docs/BR_UC.md). */
export function NavMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="rounded-3xl border border-accent/40 bg-surface p-5 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 size-5 text-warning" aria-hidden />
          <div>
            <p className="font-heading text-base text-text-primary">Chọn món theo sức chứa bao tử</p>
            <p className="text-xs text-text-secondary">Mở danh sách món đã lọc sẵn theo gu ăn của bạn.</p>
          </div>
        </div>
        <Link
          href="/mon-an"
          onClick={onNavigate}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary-strong hover:underline dark:text-primary"
        >
          Xem tất cả món
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {EATING_LEVELS.map((level) => {
          const tone = LEVEL_TONES[level.id];
          const Icon = level.icon;
          return (
            <li key={level.id}>
              <Link
                href={`/mon-an?muc=${level.id}`}
                onClick={onNavigate}
                className={cn(
                  "group/card flex h-full items-start gap-3 rounded-2xl border p-3.5 transition-transform duration-200 hover:-translate-y-0.5",
                  tone.card,
                )}
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface shadow-sm transition-transform duration-300 group-hover/card:rotate-12">
                  <Icon className={cn("size-5", tone.icon)} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("font-heading text-sm", tone.title)}>{level.label}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                      {level.kcalRange}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-text-secondary">{level.tagline}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-text-secondary">
        <span>Không chọn được? Để máy chọn giúp bạn.</span>
        <Link
          href="/random"
          onClick={onNavigate}
          className="inline-flex items-center gap-1 font-bold text-accent-ink hover:underline"
        >
          <Dices className="size-3.5" aria-hidden />
          Mở máy random
        </Link>
      </div>
    </div>
  );
}

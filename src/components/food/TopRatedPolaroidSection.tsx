import Link from "next/link";
import { ArrowRight, Star, Store } from "lucide-react";
import type { EatingLevel, Food } from "@/types/food";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { cn, formatPriceShort } from "@/lib/utils";
import { FoodImage } from "@/components/food/FoodImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

interface TopRatedPolaroidSectionProps {
  items: { level: EatingLevel; food: Food }[];
  /** Comment review thật mới nhất theo foodId — món không có thì không hiện câu trích. */
  quotes: Record<string, string>;
  foodCount: number;
}

/** Nghiêng xen kẽ kiểu ảnh polaroid dán tường — về thẳng khi hover (chỉ đổi transform). */
const TILTS = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-1"];

export function TopRatedPolaroidSection({ items, quotes, foodCount }: TopRatedPolaroidSectionProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="top-rated-title" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          id="top-rated-title"
          tone="warning"
          eyebrow="Cộng đồng chấm điểm"
          title="Rating cao nhất mỗi kiểu thèm ăn"
        />
        <Link
          href="/mon-an"
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary hover:text-secondary-strong dark:hover:text-text-primary transition-colors"
        >
          Xem tất cả {foodCount} món ăn
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {items.map(({ level, food }, index) => {
          const quote = quotes[food.id];
          return (
            <Reveal key={food.id} delay={index * 0.08} className="h-full">
              <Link
                href={`/mon-an/${food.id}`}
                className={cn(
                  "group block h-full rounded-2xl border border-border bg-surface p-2.5 pb-4 sm:p-4 sm:pb-5 shadow-md transition-transform duration-300 hover:rotate-0 hover:-translate-y-1",
                  TILTS[index % TILTS.length],
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-primary-soft">
                  <FoodImage
                    src={food.images[0]}
                    alt={`Ảnh món ${food.name}`}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    imageClassName="group-hover:scale-105"
                  />
                  <span className="absolute top-2 right-2 rounded-md bg-black/65 px-2 py-0.5 font-mono text-xs text-white">
                    {formatPriceShort(food.priceMin, food.priceMax)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-text-secondary">
                    {EATING_LEVEL_LABELS[level]}
                  </span>
                  {food.ratingCount > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 font-bold text-text-primary">
                      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                      {food.avgRating.toFixed(1)}
                      <span className="font-medium text-text-secondary">({food.ratingCount})</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm sm:text-base font-semibold text-text-primary line-clamp-2">{food.name}</h3>
                {food.restaurant && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                    <Store className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{food.restaurant.name}</span>
                  </p>
                )}
                {quote && (
                  <blockquote className="mt-2 hidden sm:block text-sm italic text-text-secondary line-clamp-2">
                    “{quote}”
                  </blockquote>
                )}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

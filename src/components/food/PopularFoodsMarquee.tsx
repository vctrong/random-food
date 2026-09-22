"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { formatPriceRange } from "@/lib/utils";

interface PopularFoodsMarqueeProps {
  foods: Food[];
}

/**
 * Marquee vô tận thuần CSS (keyframe `marquee-scroll` ở globals.css) — render
 * danh sách 2 lần liên tiếp rồi trượt đúng 50% chiều rộng để tạo vòng lặp liền
 * mạch. Tự dừng khi hover và khi `prefers-reduced-motion` (rule global).
 */
export function PopularFoodsMarquee({ foods }: PopularFoodsMarqueeProps) {
  if (foods.length === 0) return null;

  const track = [...foods, ...foods];

  return (
    <section className="py-16 -mx-4 md:-mx-6 lg:-mx-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-primary-pink font-bold">
            Món ăn nổi bật
          </span>
          <h2 className="text-display-sm text-text-primary mt-1">Rating cao nhất mỗi kiểu thèm ăn</h2>
        </div>
        <Link
          href="/mon-an"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary-blue hover:text-[#4a8ddb] transition-colors shrink-0"
        >
          Xem tất cả món ăn
        </Link>
      </div>

      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="flex w-max gap-4 px-4 md:px-6 lg:px-8 animate-marquee-scroll hover:[animation-play-state:paused]">
          {track.map((food, index) => (
            <Link
              key={`${food.id}-${index}`}
              href={food.categories[0] ? `/random?category=${food.categories[0].id}` : "/random"}
              className="group relative w-64 sm:w-72 shrink-0 rounded-2xl overflow-hidden bg-surface shadow-sm hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative w-full aspect-[4/3] bg-soft-blue overflow-hidden">
                {food.images[0] ? (
                  <Image
                    src={food.images[0]}
                    alt={`Ảnh minh hoạ món ${food.name}`}
                    fill
                    sizes="288px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary-blue">
                    <UtensilsCrossed className="size-10" aria-hidden />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                {food.ratingCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-bold text-text-primary">
                    <Star className="size-3 fill-yellow-400 text-yellow-400" aria-hidden />
                    {food.avgRating.toFixed(1)}
                  </span>
                )}
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <p className="font-semibold truncate">{food.name}</p>
                  {food.restaurant && (
                    <p className="text-xs text-white/80 truncate">{food.restaurant.name}</p>
                  )}
                </div>
              </div>
              {food.priceMin !== null && food.priceMax !== null && (
                <div className="px-3 py-2 text-sm font-semibold text-primary-blue">
                  {formatPriceRange(food.priceMin, food.priceMax)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

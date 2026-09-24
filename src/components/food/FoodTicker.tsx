import { Dices, Sparkles, Store, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Food } from "@/types/food";

interface FoodTickerProps {
  foods: Food[];
  foodCount: number;
  restaurantCount: number;
  randomCount90d: number;
}

/** Số mục tối thiểu của MỘT nửa track — đủ dài để phủ màn hình rộng, tránh khoảng trống khi lặp. */
const MIN_ITEMS_PER_HALF = 12;

function fillTrack<T>(items: T[]): T[] {
  if (items.length === 0) return [];
  const repeat = Math.ceil(MIN_ITEMS_PER_HALF / items.length);
  const half = Array.from({ length: repeat }, () => items).flat();
  // Track = 2 nửa giống hệt nhau, keyframe trượt đúng 50% nên vòng lặp liền mạch.
  return [...half, ...half];
}

const numberFormatter = new Intl.NumberFormat("vi-VN");

/**
 * Dải chạy chữ dưới hero — thuần CSS (keyframe ở globals.css), dừng khi hover (rule :hover ở globals.css),
 * đứng yên khi reduced-motion (rule global). Toàn bộ nội dung là dữ liệu thật.
 */
export function FoodTicker({ foods, foodCount, restaurantCount, randomCount90d }: FoodTickerProps) {
  const foodTrack = fillTrack(foods.map((food) => food.name));
  const stats: { icon: LucideIcon; text: string }[] = [
    { icon: UtensilsCrossed, text: `${numberFormatter.format(foodCount)} món ngon đã được duyệt tại Cần Thơ` },
    { icon: Store, text: `${numberFormatter.format(restaurantCount)} quán ăn có vị trí trên bản đồ` },
    { icon: Dices, text: `${numberFormatter.format(randomCount90d)} lượt random trong 90 ngày qua` },
  ];
  const statTrack = fillTrack(stats);

  if (foodTrack.length === 0) return null;

  return (
    <section aria-label="Món ăn và con số nổi bật" className="bg-secondary py-4 md:py-5 overflow-hidden select-none">
      <div className="overflow-hidden">
        <ul className="flex w-max items-center gap-5 animate-marquee-scroll font-heading text-sm md:text-base font-semibold text-white">
          {foodTrack.map((name, index) => (
            <li key={`${name}-${index}`} className="flex items-center gap-5 whitespace-nowrap" aria-hidden={index >= foodTrack.length / 2}>
              <span>{name}</span>
              <Sparkles className="size-3.5 text-accent-ink" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2.5 overflow-hidden">
        <ul className="flex w-max items-center gap-6 animate-marquee-scroll-reverse text-xs md:text-sm font-extrabold uppercase tracking-wider text-warning">
          {statTrack.map(({ icon: Icon, text }, index) => (
            <li key={`${text}-${index}`} className="flex items-center gap-2 whitespace-nowrap" aria-hidden={index >= statTrack.length / 2}>
              <Icon className="size-3.5" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

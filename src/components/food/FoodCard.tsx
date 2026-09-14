import Image from "next/image";
import { Dices, Flame, Heart } from "lucide-react";
import type { Food } from "@/types/food";
import { HUNGER_LEVELS } from "@/constants/categories";
import { formatCalories, formatPriceRange, formatRelativeTime } from "@/lib/utils";

interface FoodCardProps {
  food: Food;
  savedAt?: string;
  onUnsave?: (foodId: string) => void;
  onPick?: (food: Food) => void;
}

export function FoodCard({ food, savedAt, onUnsave, onPick }: FoodCardProps) {
  const hungerConfig = HUNGER_LEVELS.find((level) => level.id === food.hungerLevel);

  return (
    <article className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-soft-blue">
        <Image
          src={`https://picsum.photos/seed/${food.imageSeed}/480/360`}
          alt={`Ảnh minh hoạ ${food.name}`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {hungerConfig && (
            <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-primary-blue text-xs font-semibold">
              {hungerConfig.label}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-primary-pink text-xs font-semibold flex items-center gap-0.5">
            <Flame className="size-3" aria-hidden />
            {formatCalories(food.calories)}
          </span>
        </div>
        {onUnsave && (
          <button
            type="button"
            aria-label="Bỏ lưu món này"
            title="Bỏ lưu món này"
            onClick={() => onUnsave(food.id)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-primary-pink shadow-md hover:bg-primary-pink hover:text-white transition-all"
          >
            <Heart className="size-4" fill="currentColor" aria-hidden />
          </button>
        )}
        {savedAt && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
            <span>Lưu {formatRelativeTime(savedAt)}</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-text-primary group-hover:text-primary-blue transition-colors line-clamp-1 mb-1">
            {food.name}
          </h2>
          <div className="text-sm font-semibold text-primary-blue mb-2">
            {formatPriceRange(food.priceMin, food.priceMax)}
          </div>
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">{food.description}</p>
        </div>
        {onPick && (
          <button
            type="button"
            onClick={() => onPick(food)}
            className="w-full h-10 rounded-xl bg-soft-blue text-primary-blue hover:bg-primary-blue hover:text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Dices className="size-4" aria-hidden />
            <span>Chọn món này</span>
          </button>
        )}
      </div>
    </article>
  );
}

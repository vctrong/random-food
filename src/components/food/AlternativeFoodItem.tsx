import Image from "next/image";
import { Clock } from "lucide-react";
import type { Food } from "@/types/food";
import { formatPriceRange } from "@/lib/utils";
import { HUNGER_LEVELS } from "@/constants/categories";

interface AlternativeFoodItemProps {
  food: Food;
  onSelect: (food: Food) => void;
}

export function AlternativeFoodItem({ food, onSelect }: AlternativeFoodItemProps) {
  const hungerLabel = HUNGER_LEVELS.find((level) => level.id === food.hungerLevel)?.label;

  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-soft-blue transition-colors text-left w-full"
    >
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-sm">
        <Image
          src={`https://picsum.photos/seed/${food.imageSeed}/128/128`}
          alt={`Ảnh minh hoạ ${food.name}`}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-text-primary truncate group-hover:text-primary-blue transition-colors">
            {food.name}
          </h3>
          <span className="text-xs font-semibold text-primary-blue shrink-0">
            {formatPriceRange(food.priceMin, food.priceMax)}
          </span>
        </div>
        <p className="text-xs text-text-secondary truncate">
          {hungerLabel} • {food.restaurantName}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-text-secondary">
          <Clock className="size-3 text-primary-blue" aria-hidden />
          {food.area}
        </div>
      </div>
    </button>
  );
}

import Image from "next/image";
import { MapPin, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { formatPriceRange } from "@/lib/utils";
import { EATING_LEVEL_LABELS } from "@/constants/categories";

interface RelatedFoodItemProps {
  food: Food;
  onSelect: (food: Food) => void;
}

export function RelatedFoodItem({ food, onSelect }: RelatedFoodItemProps) {
  const eatingLevelLabel = food.eatingLevels[0] ? EATING_LEVEL_LABELS[food.eatingLevels[0]] : null;
  const coverImage = food.images[0] ?? null;
  const priceLabel =
    food.priceMin !== null && food.priceMax !== null
      ? formatPriceRange(food.priceMin, food.priceMax)
      : "Chưa cập nhật giá";

  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-primary-soft transition-colors text-left w-full"
    >
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-sm bg-primary-soft">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`Ảnh minh hoạ ${food.name}`}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary">
            <UtensilsCrossed className="size-5" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
            {food.name}
          </h3>
          <span className="text-xs font-semibold text-primary shrink-0">{priceLabel}</span>
        </div>
        <p className="text-xs text-text-secondary truncate">
          {eatingLevelLabel} • {food.restaurant?.name ?? "Chưa rõ quán"}
        </p>
        {food.restaurant && (
          <div className="flex items-center gap-1 mt-1 text-xs text-text-secondary">
            <MapPin className="size-3 text-primary" aria-hidden />
            <span className="truncate">{food.restaurant.address}</span>
          </div>
        )}
      </div>
    </button>
  );
}

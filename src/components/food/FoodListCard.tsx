import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Info, MapPin, Star, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { cn, formatPriceRange, getGoogleMapsUrl } from "@/lib/utils";

interface FoodListCardProps {
  food: Food;
}

export function FoodListCard({ food }: FoodListCardProps) {
  const coverImage = food.images[0] ?? null;
  const priceLabel =
    food.priceMin !== null && food.priceMax !== null
      ? formatPriceRange(food.priceMin, food.priceMax)
      : "Chưa cập nhật giá";

  return (
    <article className="group flex flex-col bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-primary-soft">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`Ảnh món ${food.name}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary">
            <UtensilsCrossed className="size-10" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {food.eatingLevels.slice(0, 1).map((level) => (
            <span
              key={level}
              className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-primary text-xs font-semibold"
            >
              {EATING_LEVEL_LABELS[level]}
            </span>
          ))}
          {food.eatingLevels.length > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-text-secondary text-xs font-semibold">
              +{food.eatingLevels.length - 1}
            </span>
          )}
        </div>
        {food.ratingCount > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-semibold text-text-primary">
            <Star className="size-3 text-warning" fill="currentColor" aria-hidden />
            {food.avgRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-heading font-semibold text-text-primary line-clamp-1">{food.name}</h2>
        </div>
        <div className="text-sm font-semibold text-primary mb-2">{priceLabel}</div>
        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
          {food.description || "Chưa có mô tả cho món này."}
        </p>

        {food.restaurant && (
          <div className="flex items-start gap-1.5 text-xs text-text-secondary mb-3">
            <MapPin className="size-3.5 shrink-0 mt-0.5" aria-hidden />
            <span className="line-clamp-1">
              <span className="font-medium text-text-primary">{food.restaurant.name}</span>
              {" · "}
              {food.restaurant.address}
            </span>
          </div>
        )}

        {food.categories.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5 mb-3")}>
            {food.categories.map((category) => (
              <span
                key={category.id}
                className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink text-xs font-medium"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2">
          <Link
            href={`/mon-an/${food.id}`}
            className="flex-1 h-10 rounded-xl bg-primary-soft text-primary hover:bg-primary-strong hover:text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Info className="size-4" aria-hidden />
            <span>Xem chi tiết</span>
          </Link>
          {food.restaurant && (
            <a
              href={getGoogleMapsUrl(food.restaurant.location, food.restaurant.address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Định vị trên Google Maps"
              title="Định vị trên Google Maps"
              className="w-10 h-10 shrink-0 rounded-xl bg-accent-soft text-accent-ink hover:bg-accent-strong hover:text-white flex items-center justify-center transition-colors"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

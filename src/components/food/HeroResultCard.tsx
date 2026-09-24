"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Heart, MapPin, Navigation, RotateCw, Star, Store, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { cn, formatPriceRange, getGoogleMapsUrl } from "@/lib/utils";
import { FoodImage } from "@/components/food/FoodImage";

interface HeroResultCardProps {
  food: Food;
  isSaved: boolean;
  isSpinning: boolean;
  onToggleSave: () => void;
  onRespin: () => void;
  /** Ẩn thẻ để xem lại máy random (thẻ đang hiện đè lên máy). */
  onBackToMachine?: () => void;
}

export function HeroResultCard({ food, isSaved, isSpinning, onToggleSave, onRespin, onBackToMachine }: HeroResultCardProps) {
  const restaurant = food.restaurant;

  return (
    <article
      className={cn(
        "relative rounded-2xl border-2 border-secondary bg-surface shadow-chunky p-4 sm:p-5 text-left transition-opacity duration-300",
        isSpinning && "opacity-60",
      )}
      aria-live="polite"
    >
      {onBackToMachine && (
        <button
          type="button"
          onClick={onBackToMachine}
          className="absolute -top-4 left-4 inline-flex h-8 items-center gap-1 rounded-full border-2 border-secondary bg-surface px-3 text-xs font-bold text-text-primary transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Quay lại máy
        </button>
      )}
      <span className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-secondary-strong border-2 border-secondary">
        Trúng món rồi!
      </span>

      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="relative size-18 sm:size-22 shrink-0 overflow-hidden rounded-xl bg-primary-soft border border-border">
            <FoodImage src={food.images[0]} alt={`Ảnh món ${food.name}`} sizes="88px" fallbackIconClassName="size-7" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-2xl sm:text-3xl leading-tight tracking-wide text-text-primary line-clamp-2 sm:line-clamp-1">
                {food.name}
              </h3>
              {food.ratingCount > 0 && (
                <span className="shrink-0 inline-flex items-center gap-1 pt-1 text-sm font-bold text-text-primary">
                  <Star className="size-4 fill-warning text-warning" aria-hidden />
                  {food.avgRating.toFixed(1)}
                  <span className="font-medium text-text-secondary">({food.ratingCount})</span>
                </span>
              )}
            </div>

            {restaurant && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-text-secondary">
                <Store className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="font-semibold text-text-primary">{restaurant.name}</span>
                  {restaurant.address && <span className="hidden sm:inline"> · {restaurant.address}</span>}
                </span>
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm">
              {food.priceMin !== null && food.priceMax !== null && (
                <span className="rounded-md bg-accent-soft px-2 py-0.5 font-bold text-text-primary">
                  {formatPriceRange(food.priceMin, food.priceMax)}
                </span>
              )}
              {restaurant?.openingHours && (
                <span className="inline-flex items-center gap-1 text-text-secondary">
                  <Clock className="size-3.5" aria-hidden />
                  {restaurant.openingHours}
                </span>
              )}
              {restaurant?.address && (
                <span className="inline-flex items-center gap-1 text-text-secondary sm:hidden min-w-0">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{restaurant.address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid sm:flex sm:flex-wrap sm:items-center gap-2 pt-3 border-t border-border",
            restaurant?.location ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          {restaurant?.location && (
            <a
              href={getGoogleMapsUrl(restaurant.location, restaurant.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-primary-strong px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-white border-2 border-secondary shadow-chunky-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <Navigation className="size-4" aria-hidden />
              Chỉ đường
            </a>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={isSaved}
            className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-surface px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-text-primary border-2 border-secondary shadow-chunky-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            <Heart className={cn("size-4 text-accent-ink", isSaved && "fill-accent")} aria-hidden />
            {isSaved ? "Đã lưu" : "Lưu món"}
          </button>
          <Link
            href={`/mon-an/${food.id}`}
            className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-primary-soft px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-text-primary border-2 border-border transition-colors hover:border-secondary"
          >
            <UtensilsCrossed className="size-4 text-primary" aria-hidden />
            Chi tiết
          </Link>
          <button
            type="button"
            onClick={onRespin}
            disabled={isSpinning}
            className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-background px-2 sm:px-3 py-2 text-[11px] sm:text-sm font-bold text-text-primary border-2 border-border transition-colors hover:border-secondary disabled:opacity-50"
          >
            <RotateCw className="size-4" aria-hidden />
            Đổi món
          </button>
        </div>
      </div>
    </article>
  );
}

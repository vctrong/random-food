"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { CheckCircle2, Heart, MapPin, Star, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatPriceRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { RestaurantMap } from "@/components/map/RestaurantMap";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { useToast } from "@/components/ui/ToastProvider";
import { addSavedFood, isFoodSaved, removeSavedFood } from "@/services/savedFoodService";
import { addHistoryEntry } from "@/services/historyService";

interface FoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: Food;
}

function formatCaloriesRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `~${min}-${max} kcal`;
  return `~${min ?? max} kcal`;
}

export function FoodDetailModal({ isOpen, onClose, food }: FoodDetailModalProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);

  useEffect(() => {
    // Đọc localStorage (nguồn bên ngoài) mỗi lần modal mở lại — không thể đọc lúc SSR.
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSaved(isFoodSaved(food.id));
    }
  }, [isOpen, food.id]);

  const coverImage = food.images[0] ?? null;
  const priceLabel =
    food.priceMin !== null && food.priceMax !== null
      ? formatPriceRange(food.priceMin, food.priceMax)
      : "Chưa cập nhật giá";
  const caloriesLabel = formatCaloriesRange(food.caloriesMin, food.caloriesMax);

  const toggleSaved = () => {
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    if (isSaved) {
      removeSavedFood(food.id);
      setIsSaved(false);
      showToast("Đã bỏ lưu món ăn.", "info");
    } else {
      addSavedFood(food.id);
      setIsSaved(true);
      showToast("Đã lưu món vào danh sách yêu thích!", "success");
    }
  };

  const markEaten = () => {
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    addHistoryEntry({
      foodId: food.id,
      timestamp: new Date().toISOString(),
      eatingLevel: food.eatingLevels[0] ?? null,
      wasEaten: true,
      isSaved,
    });
    showToast("Đã ghi nhận bữa ăn vào lịch sử!", "success");
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative w-full h-56 sm:h-72 bg-soft-blue rounded-t-3xl overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`Ảnh món ${food.name}`}
              fill
              sizes="640px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-blue">
              <UtensilsCrossed className="size-12" aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <h2 className="text-2xl font-bold drop-shadow-md font-heading">{food.name}</h2>
            {food.restaurant && <p className="text-sm text-white/90 mt-0.5">{food.restaurant.name}</p>}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-primary-blue">{priceLabel}</span>
            {caloriesLabel && <span className="text-sm text-text-secondary">{caloriesLabel}</span>}
            {food.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-text-primary">
                <Star className="size-4 text-warning" fill="currentColor" aria-hidden />
                {food.avgRating.toFixed(1)}
                <span className="text-text-secondary font-normal">({food.ratingCount} đánh giá)</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {food.eatingLevels.map((level) => (
              <Badge key={level} variant="blue">
                {EATING_LEVEL_LABELS[level]}
              </Badge>
            ))}
            {food.categories.map((category) => (
              <Badge key={category.id} variant="pink">
                {category.name}
              </Badge>
            ))}
            {food.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))}
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            {food.description || "Chưa có mô tả cho món này."}
          </p>

          {food.restaurant && (
            <div className="space-y-2">
              <div className="flex items-start gap-1.5 text-sm text-text-primary">
                <MapPin className="size-4 shrink-0 mt-0.5 text-primary-blue" aria-hidden />
                <span>
                  <span className="font-semibold">{food.restaurant.name}</span>
                  <span className="text-text-secondary"> · {food.restaurant.address}</span>
                </span>
              </div>
              <div className="h-56 rounded-xl overflow-hidden">
                <RestaurantMap
                  location={food.restaurant.location}
                  name={food.restaurant.name}
                  address={food.restaurant.address}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={markEaten}
              className="flex-1 h-12 rounded-full bg-primary-blue hover:bg-[#4a8ddb] text-white font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-5" aria-hidden />
              <span>Chọn đi ăn món này</span>
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              className="h-12 px-5 rounded-full bg-soft-pink hover:bg-primary-pink/20 text-text-primary font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Heart className="size-5 text-primary-pink" fill={isSaved ? "currentColor" : "none"} aria-hidden />
              <span>{isSaved ? "Đã lưu" : "Lưu món"}</span>
            </button>
          </div>
        </div>
      </Modal>

      <LoginGateModal isOpen={isLoginGateOpen} onClose={() => setIsLoginGateOpen(false)} />
    </>
  );
}

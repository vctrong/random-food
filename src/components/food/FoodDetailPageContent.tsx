"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  ChevronRight,
  Dices,
  Heart,
  Home,
  MapPin,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import type { Food } from "@/types/food";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatPriceRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { RestaurantMap } from "@/components/map/RestaurantMap";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { useToast } from "@/components/ui/ToastProvider";
import { addSavedFood, getSavedFoodRecords, removeSavedFood } from "@/services/savedFoodService";
import { addHistoryEntry } from "@/services/historyService";
import { FoodReviewsSection } from "./FoodReviewsSection";

interface FoodDetailPageContentProps {
  food: Food;
  similarFoods: Food[];
}

function formatCaloriesRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `~${min}-${max} kcal`;
  return `~${min ?? max} kcal`;
}

export function FoodDetailPageContent({ food, similarFoods }: FoodDetailPageContentProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getSavedFoodRecords().then((records) => {
      if (!cancelled) setIsSaved(records.some((record) => record.foodId === food.id));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, food.id]);

  const toggleSaved = async () => {
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    const ok = wasSaved ? await removeSavedFood(food.id) : await addSavedFood(food.id);
    if (!ok) {
      setIsSaved(wasSaved);
      showToast("Không thể cập nhật món đã lưu, vui lòng thử lại.", "error");
      return;
    }
    showToast(wasSaved ? "Đã bỏ lưu món ăn." : "Đã lưu món vào danh sách yêu thích!", wasSaved ? "info" : "success");
  };

  const markEaten = async () => {
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    if (!food.restaurant) {
      showToast("Món này chưa gắn quán, không thể ghi nhận lịch sử.", "error");
      return;
    }
    const ok = await addHistoryEntry({ foodId: food.id, restaurantId: food.restaurant.id });
    showToast(
      ok ? "Đã ghi nhận bữa ăn vào lịch sử!" : "Không thể ghi nhận vào lịch sử, vui lòng thử lại.",
      ok ? "success" : "error",
    );
  };

  const priceLabel =
    food.priceMin !== null && food.priceMax !== null ? formatPriceRange(food.priceMin, food.priceMax) : "Chưa cập nhật giá";
  const caloriesLabel = formatCaloriesRange(food.caloriesMin, food.caloriesMax);
  const coverImage = food.images[activeImage] ?? food.images[0] ?? null;

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <div className="w-full bg-surface/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-secondary overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="size-3.5" aria-hidden />
              <span>Trang chủ</span>
            </Link>
            <ChevronRight className="size-3.5 text-border shrink-0" aria-hidden />
            <Link href="/mon-an" className="hover:text-primary transition-colors">
              Danh sách món ăn
            </Link>
            <ChevronRight className="size-3.5 text-border shrink-0" aria-hidden />
            <span className="text-text-primary font-semibold truncate max-w-xs">{food.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Gallery */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-primary-soft">
              {coverImage ? (
                <Image src={coverImage} alt={`Ảnh món ${food.name}`} fill sizes="(min-width: 1024px) 50vw, 100vw" priority className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary">
                  <UtensilsCrossed className="size-16" aria-hidden />
                </div>
              )}
              {food.ratingCount > 0 && (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-sm">
                  <Star className="size-4 text-warning" fill="currentColor" aria-hidden />
                  <span className="font-semibold">{food.avgRating.toFixed(1)}</span>
                  <span className="text-white/80">({food.ratingCount} đánh giá)</span>
                </div>
              )}
            </div>
            {food.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {food.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`relative rounded-xl overflow-hidden aspect-square bg-primary-soft transition-all ${
                      index === activeImage ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image src={image} alt={`Ảnh ${index + 1} của ${food.name}`} fill sizes="120px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary tracking-tight mb-2">{food.name}</h1>
              <p className="text-text-secondary leading-relaxed">{food.description || "Chưa có mô tả cho món này."}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Giá tham khảo" value={priceLabel} />
              <InfoCard label="Năng lượng" value={caloriesLabel ?? "Chưa cập nhật"} />
              <InfoCard label="Đánh giá" value={food.ratingCount > 0 ? `${food.avgRating.toFixed(1)} / 5` : "Chưa có"} />
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

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={markEaten}
                className="flex-1 h-12 rounded-full bg-primary-strong hover:bg-primary-strong-hover text-white font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-5" aria-hidden />
                <span>Đã ăn món này</span>
              </button>
              <button
                type="button"
                onClick={toggleSaved}
                className="h-12 px-5 rounded-full bg-accent-soft hover:bg-accent/20 text-text-primary font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Heart className="size-5 text-accent-ink" fill={isSaved ? "currentColor" : "none"} aria-hidden />
                <span>{isSaved ? "Đã lưu" : "Lưu món"}</span>
              </button>
            </div>

            {food.restaurant && (
              <div className="space-y-2">
                <div className="flex items-start gap-1.5 text-sm text-text-primary">
                  <MapPin className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
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

            <div className="rounded-2xl bg-primary-soft/60 p-4 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-text-secondary leading-relaxed">
                Chỉ những thực khách đã xác nhận <strong className="text-text-primary">đã ăn món này</strong> mới có thể để
                lại đánh giá. Sau khi bấm &quot;Đã ăn món này&quot;, bạn có thể viết đánh giá ngay tại trang{" "}
                <Link href="/lich-su" className="text-primary font-semibold hover:underline">
                  Lịch sử ăn uống
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-8">
          <FoodReviewsSection foodId={food.id} avgRating={food.avgRating} ratingCount={food.ratingCount} />
        </div>

        {/* Similar foods */}
        {similarFoods.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-heading font-bold text-text-primary mb-4">Món ăn cùng danh mục</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similarFoods.map((item) => (
                <SimilarFoodCard key={item.id} food={item} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/random"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent-soft hover:bg-accent/20 text-accent-ink font-semibold transition-all active:scale-95"
          >
            <Dices className="size-5" aria-hidden />
            <span>Không hợp gu? Random món khác</span>
          </Link>
        </div>
      </div>

      <LoginGateModal isOpen={isLoginGateOpen} onClose={() => setIsLoginGateOpen(false)} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-primary-soft/60">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className="font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function SimilarFoodCard({ food }: { food: Food }) {
  const priceLabel =
    food.priceMin !== null && food.priceMax !== null ? formatPriceRange(food.priceMin, food.priceMax) : "Chưa cập nhật giá";
  const coverImage = food.images[0] ?? null;

  return (
    <Link
      href={`/mon-an/${food.id}`}
      className="group flex flex-col bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="relative w-full aspect-[16/10] bg-primary-soft">
        {coverImage ? (
          <Image src={coverImage} alt={`Ảnh món ${food.name}`} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary">
            <UtensilsCrossed className="size-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-semibold text-text-primary truncate">{food.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="text-primary font-semibold">{priceLabel}</span>
          {food.ratingCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3 text-warning" fill="currentColor" aria-hidden />
              {food.avgRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Dices,
  Flame,
  Heart,
  Lightbulb,
  MapPin,
  RefreshCw,
  Share2,
  Soup,
  Sparkles,
  Star,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import type { EatingLevel, Food } from "@/types/food";
import { useRandomFood } from "@/features/random-food/useRandomFood";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatPriceRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { MultiSelectFilterBar } from "@/components/filters/MultiSelectFilterBar";
import { RestaurantMap } from "@/components/map/RestaurantMap";
import { AlternativeFoodItem } from "./AlternativeFoodItem";
import { RandomLoadingSkeleton } from "./RandomLoadingSkeleton";
import { FoodReviewsSection } from "./FoodReviewsSection";

interface RandomFoodResultProps {
  allFoods: Food[];
  eatingLevel: EatingLevel | null;
  categoryId: string | null;
  initialFood: Food | null;
  initialAlternatives: Food[];
}

function formatCaloriesRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Chưa cập nhật";
  if (min !== null && max !== null && min !== max) return `~${min}-${max} kcal`;
  return `~${min ?? max} kcal`;
}

export function RandomFoodResult({
  allFoods,
  eatingLevel: initialEatingLevel,
  categoryId: initialCategoryId,
  initialFood,
  initialAlternatives,
}: RandomFoodResultProps) {
  const {
    eatingLevel,
    currentFood,
    alternatives,
    isRandomizing,
    poolSize,
    isSaved,
    selectedCategoryIds,
    selectedTags,
    toggleCategory,
    toggleTag,
    randomize,
    randomizeAll,
    selectFood,
    toggleSaved,
    markEaten,
    share,
    isLoginGateOpen,
    closeLoginGate,
  } = useRandomFood({
    allFoods,
    initialEatingLevel,
    initialCategoryId,
    initialFood,
    initialAlternatives,
  });

  const eatingLevelConfig = eatingLevel ? EATING_LEVEL_LABELS[eatingLevel] : null;
  const hasNoData = poolSize === 0 && !isRandomizing;
  const hasActiveFilters = selectedCategoryIds.length > 0 || selectedTags.length > 0;

  const categoryFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const food of allFoods) {
      for (const category of food.categories) map.set(category.id, category.name);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [allFoods]);

  const tagFilterOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const food of allFoods) for (const tag of food.tags) tags.add(tag);
    return [...tags].sort((a, b) => a.localeCompare(b, "vi")).map((tag) => ({ id: tag, label: tag }));
  }, [allFoods]);

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-16">
      <div
        aria-hidden
        className="absolute top-10 right-1/4 w-96 h-96 bg-soft-blue/60 rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-soft-blue transition-colors shadow-sm text-sm font-medium text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span>Quay lại chọn chế độ</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-soft-blue text-primary-blue text-sm font-medium">
            <UtensilsCrossed className="size-3.5" aria-hidden />
            <span>Chế độ: {eatingLevelConfig ?? "Ngẫu nhiên tất cả món"}</span>
          </div>
          {selectedCategoryIds.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-soft-pink text-primary-pink text-sm font-medium">
              <Soup className="size-3.5" aria-hidden />
              <span>
                Danh mục:{" "}
                {selectedCategoryIds
                  .map((id) => categoryFilterOptions.find((c) => c.id === id)?.label ?? id)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
        {currentFood && !isRandomizing && (
          <div className="inline-flex items-center gap-2 self-start lg:self-auto px-4 py-1.5 rounded-full bg-white shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-blue opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-blue" />
            </span>
            <span className="text-sm text-text-primary">Đã tìm thấy món phù hợp cho bạn!</span>
          </div>
        )}
      </div>

      {/* Bộ lọc đa chọn */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary uppercase tracking-wider">
            <CheckCircle2 className="size-4 text-primary-blue" aria-hidden />
            <span>Đang lọc từ {poolSize} món phù hợp</span>
          </div>
          <button
            type="button"
            onClick={randomizeAll}
            disabled={isRandomizing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-soft-pink text-primary-pink text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            <Dices className="size-4" aria-hidden />
            Random hoàn toàn
          </button>
        </div>

        {categoryFilterOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Soup className="size-3.5" aria-hidden />
              Danh mục
            </span>
            <MultiSelectFilterBar
              options={categoryFilterOptions}
              values={selectedCategoryIds}
              onToggle={toggleCategory}
            />
          </div>
        )}

        {tagFilterOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Tag className="size-3.5" aria-hidden />
              Đặc điểm
            </span>
            <MultiSelectFilterBar options={tagFilterOptions} values={selectedTags} onToggle={toggleTag} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
            {hasNoData ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={hasActiveFilters ? "Không có món nào khớp bộ lọc" : "Chưa có dữ liệu món ăn"}
                description={
                  hasActiveFilters
                    ? "Thử bỏ bớt danh mục hoặc đặc điểm đang chọn để mở rộng kết quả."
                    : "Hệ thống chưa có món ăn nào được duyệt công khai, quay lại sau nhé."
                }
                action={
                  hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={randomizeAll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-blue text-white text-sm font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      Xoá bộ lọc
                    </button>
                  ) : undefined
                }
              />
            ) : isRandomizing || !currentFood ? (
              <RandomLoadingSkeleton />
            ) : (
              <div key={currentFood.id} className="animate-fade-slide-up">
                <div className="relative w-full h-72 sm:h-96 md:h-[420px] rounded-xl overflow-hidden mb-6 group bg-soft-blue">
                  {currentFood.images[0] ? (
                    <Image
                      src={currentFood.images[0]}
                      alt={`Ảnh minh hoạ món ${currentFood.name}`}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-blue">
                      <UtensilsCrossed className="size-16" aria-hidden />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-primary-blue text-sm font-semibold shadow-md">
                      <Sparkles className="size-3.5" aria-hidden />
                      Gợi ý hôm nay
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                    <div className="text-white">
                      <p className="text-xs text-white/80 uppercase tracking-wider mb-1">
                        Món ăn gợi ý cho bạn
                      </p>
                      <h1 className="text-3xl md:text-4xl font-bold drop-shadow-md">
                        {currentFood.name}
                      </h1>
                    </div>
                    {currentFood.restaurant && (
                      <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-sm shrink-0">
                        {currentFood.restaurant.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard
                    icon={Banknote}
                    label="Giá tham khảo"
                    value={
                      currentFood.priceMin !== null && currentFood.priceMax !== null
                        ? formatPriceRange(currentFood.priceMin, currentFood.priceMax)
                        : "Chưa cập nhật"
                    }
                    hint="Phổ thông, hợp túi tiền"
                  />
                  <StatCard
                    icon={Flame}
                    label="Năng lượng"
                    value={formatCaloriesRange(currentFood.caloriesMin, currentFood.caloriesMax)}
                    hint={currentFood.categories[0]?.name ?? "Chưa phân loại"}
                  />
                  <StatCard
                    icon={Star}
                    label="Đánh giá"
                    value={
                      currentFood.ratingCount > 0 ? `${currentFood.avgRating.toFixed(1)} / 5` : "Chưa có"
                    }
                    hint={
                      currentFood.ratingCount > 0 ? `${currentFood.ratingCount} lượt đánh giá` : "Món mới"
                    }
                  />
                </div>

                {currentFood.restaurant && (
                  <div className="rounded-xl overflow-hidden mb-6">
                    <div className="h-56">
                      <RestaurantMap
                        location={currentFood.restaurant.location}
                        name={currentFood.restaurant.name}
                        address={currentFood.restaurant.address}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="bg-soft-blue/60 px-4 py-2.5 flex items-center gap-1.5 text-sm text-text-secondary">
                      <MapPin className="size-4 text-primary-blue shrink-0" aria-hidden />
                      <span className="truncate">
                        <span className="font-medium text-text-primary">
                          {currentFood.restaurant.name}
                        </span>{" "}
                        · {currentFood.restaurant.address}
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-soft-blue/70 rounded-xl p-4 flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-blue text-white shrink-0 mt-0.5 shadow-sm">
                    <Lightbulb className="size-4" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-text-primary">Gợi ý từ trợ lý ẩm thực:</span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {currentFood.name}
                      {currentFood.priceMin !== null && currentFood.priceMax !== null
                        ? `, giá ${formatPriceRange(currentFood.priceMin, currentFood.priceMax)}`
                        : ""}
                      .{" "}
                      {currentFood.restaurant
                        ? `Có thể tìm ở quán ${currentFood.restaurant.name}, ${currentFood.restaurant.address}.`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={randomize}
              disabled={isRandomizing || hasNoData}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary-blue hover:bg-[#4a8ddb] text-white font-semibold shadow-md active:scale-95 transition-all disabled:opacity-70"
            >
              <RefreshCw
                className={isRandomizing ? "size-5 animate-spin" : "size-5"}
                aria-hidden
              />
              <span>{isRandomizing ? "Đang random..." : "Random lại"}</span>
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              disabled={!currentFood || isRandomizing}
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-soft-pink hover:bg-primary-pink/20 text-text-primary font-medium transition-all active:scale-95 disabled:opacity-60"
            >
              <Heart
                className="size-5 text-primary-pink"
                fill={isSaved ? "currentColor" : "none"}
                aria-hidden
              />
              <span>{isSaved ? "Đã lưu" : "Lưu món"}</span>
            </button>
            <button
              type="button"
              onClick={markEaten}
              disabled={!currentFood || isRandomizing}
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-soft-blue hover:bg-primary-blue/20 text-text-primary font-medium transition-all active:scale-95 disabled:opacity-60"
            >
              <CheckCircle2 className="size-5 text-primary-blue" aria-hidden />
              <span>Đã ăn món này</span>
            </button>
            <button
              type="button"
              onClick={share}
              disabled={!currentFood || isRandomizing}
              aria-label="Chia sẻ món ăn"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-soft-blue hover:bg-primary-blue/20 text-text-primary transition-all active:scale-95 disabled:opacity-60"
            >
              <Share2 className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-primary-blue uppercase font-bold tracking-wider">
              Đặc điểm món
            </span>
            {hasNoData ? (
              <p className="text-sm text-text-secondary mt-3">Chưa có món để hiển thị đặc điểm.</p>
            ) : currentFood && !isRandomizing ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {currentFood.categories.map((category) => (
                  <Badge key={category.id} variant="blue">
                    {category.name}
                  </Badge>
                ))}
                {currentFood.eatingLevels.map((level) => (
                  <Badge key={level} variant="pink">
                    {EATING_LEVEL_LABELS[level]}
                  </Badge>
                ))}
                {currentFood.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <div className="h-6 w-20 rounded-full bg-soft-blue animate-pulse" />
                <div className="h-6 w-24 rounded-full bg-soft-blue animate-pulse" />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-text-primary">Không hợp gu hôm nay?</h2>
                <p className="text-xs text-text-secondary">Lướt nhanh vài phương án dự phòng</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {alternatives.length > 0 ? (
                alternatives.map((food) => (
                  <AlternativeFoodItem key={food.id} food={food} onSelect={selectFood} />
                ))
              ) : (
                <p className="text-sm text-text-secondary py-2">
                  Không còn món dự phòng nào khớp bộ lọc hiện tại.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-primary-blue mt-0.5">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-text-primary">Tùy biến bộ lọc cá nhân</span>
                <p className="text-sm text-text-secondary">
                  Bạn có thể thay đổi sở thích ẩm thực và loại trừ món dị ứng trong phần{" "}
                  <Link
                    href="/cai-dat"
                    className="text-primary-blue font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Cài đặt
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentFood && !isRandomizing && !hasNoData && (
        <div className="mt-6">
          <FoodReviewsSection
            key={currentFood.id}
            foodId={currentFood.id}
            avgRating={currentFood.avgRating}
            ratingCount={currentFood.ratingCount}
          />
        </div>
      )}

      <LoginGateModal isOpen={isLoginGateOpen} onClose={closeLoginGate} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-soft-blue/60 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between text-text-secondary mb-1">
        <span className="text-xs">{label}</span>
        <Icon className="size-4 text-primary-blue" aria-hidden />
      </div>
      <p className="font-semibold text-text-primary">{value}</p>
      <span className="text-xs text-text-secondary mt-1">{hint}</span>
    </div>
  );
}

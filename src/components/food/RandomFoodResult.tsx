"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Leaf,
  Lightbulb,
  RefreshCw,
  Salad,
  Share2,
  Soup,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { Food, HungerLevel } from "@/types/food";
import { useRandomFood } from "@/features/random-food/useRandomFood";
import { CATEGORY_LABELS, HUNGER_LEVELS, MEAL_TIME_LABELS, SPICE_LABELS } from "@/constants/categories";
import { formatCalories, formatPriceRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { AlternativeFoodItem } from "./AlternativeFoodItem";
import { RandomLoadingSkeleton } from "./RandomLoadingSkeleton";

interface RandomFoodResultProps {
  allFoods: Food[];
  hungerLevel: HungerLevel | null;
  initialFood: Food | null;
  initialAlternatives: Food[];
}

export function RandomFoodResult({
  allFoods,
  hungerLevel: initialHungerLevel,
  initialFood,
  initialAlternatives,
}: RandomFoodResultProps) {
  const {
    hungerLevel,
    currentFood,
    alternatives,
    isRandomizing,
    poolSize,
    isSaved,
    noSpice,
    setNoSpice,
    vegetarianOnly,
    setVegetarianOnly,
    under50k,
    setUnder50k,
    randomize,
    selectFood,
    toggleSaved,
    markEaten,
    share,
    toastMessage,
  } = useRandomFood({ allFoods, initialHungerLevel, initialFood, initialAlternatives });

  const hungerConfig = HUNGER_LEVELS.find((level) => level.id === hungerLevel);

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
            <Utensils className="size-3.5" aria-hidden />
            <span>
              Chế độ: {hungerConfig ? `${hungerConfig.label} (${hungerConfig.tagline})` : "Ngẫu nhiên tất cả món"}
            </span>
          </div>
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

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-text-secondary mr-1 uppercase tracking-wider">Lọc nhanh:</span>
        <QuickFilterChip active={noSpice} onClick={() => setNoSpice(!noSpice)} icon={Flame}>
          Không ăn cay
        </QuickFilterChip>
        <QuickFilterChip active={vegetarianOnly} onClick={() => setVegetarianOnly(!vegetarianOnly)} icon={Leaf}>
          Món chay
        </QuickFilterChip>
        <QuickFilterChip active={under50k} onClick={() => setUnder50k(!under50k)} icon={Banknote}>
          Dưới 50k
        </QuickFilterChip>
        <div className="ml-auto hidden md:flex items-center gap-1.5 text-sm text-text-secondary">
          <CheckCircle2 className="size-4 text-primary-blue" aria-hidden />
          <span>Đang lọc từ {poolSize} món phù hợp</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
            {isRandomizing || !currentFood ? (
              <RandomLoadingSkeleton />
            ) : (
              <div key={currentFood.id} className="animate-fade-slide-up">
                <div className="relative w-full h-72 sm:h-96 md:h-[420px] rounded-xl overflow-hidden mb-6 group">
                  <Image
                    src={`https://picsum.photos/seed/${currentFood.imageSeed}/960/720`}
                    alt={`Ảnh minh hoạ món ${currentFood.name}`}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
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
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-sm shrink-0">
                      {currentFood.restaurantName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard
                    icon={Banknote}
                    label="Giá tham khảo"
                    value={formatPriceRange(currentFood.priceMin, currentFood.priceMax)}
                    hint="Phổ thông, hợp túi tiền"
                  />
                  <StatCard
                    icon={Soup}
                    label="Năng lượng"
                    value={formatCalories(currentFood.calories)}
                    hint={CATEGORY_LABELS[currentFood.category]}
                  />
                  <StatCard
                    icon={Clock}
                    label="Khung giờ hợp"
                    value={currentFood.mealTimes.map((t) => MEAL_TIME_LABELS[t]).join(" & ")}
                    hint={currentFood.area}
                  />
                </div>

                <div className="bg-soft-blue/70 rounded-xl p-4 flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-blue text-white shrink-0 mt-0.5 shadow-sm">
                    <Lightbulb className="size-4" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-text-primary">Gợi ý từ trợ lý ẩm thực:</span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {currentFood.name} khoảng {formatCalories(currentFood.calories)}, giá{" "}
                      {formatPriceRange(currentFood.priceMin, currentFood.priceMax)}, hợp ăn vào buổi{" "}
                      {currentFood.mealTimes.map((t) => MEAL_TIME_LABELS[t].toLowerCase()).join(", ")}.{" "}
                      {currentFood.isVegetarian && "Món chay, nhẹ bụng. "}
                      Có thể tìm ở quán {currentFood.restaurantName}, khu vực {currentFood.area}.
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
              disabled={isRandomizing}
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
            {currentFood && !isRandomizing ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="blue">{CATEGORY_LABELS[currentFood.category]}</Badge>
                <Badge variant="pink">
                  <Flame className="size-3" aria-hidden />
                  {SPICE_LABELS[currentFood.spiceLevel]}
                </Badge>
                <Badge variant={currentFood.isVegetarian ? "success" : "neutral"}>
                  <Salad className="size-3" aria-hidden />
                  {currentFood.isVegetarian ? "Món chay" : "Món mặn"}
                </Badge>
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

      <Toast message={toastMessage} />
    </div>
  );
}

function QuickFilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Flame;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-blue text-white text-sm font-medium transition-all shadow-sm active:scale-95"
          : "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-text-secondary hover:text-text-primary text-sm font-medium transition-all shadow-sm active:scale-95"
      }
    >
      <Icon className="size-3.5" aria-hidden />
      {children}
    </button>
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

"use client";

import type { ReactNode } from "react";
import { Dices, Flame, Heart, Layers, Search, Wallet } from "lucide-react";
import type { Food } from "@/types/food";
import type { SavedFoodRecord } from "@/services/savedFoodService";
import { useSavedFoods } from "@/features/saved-foods/useSavedFoods";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FoodCard } from "./FoodCard";
import { SavedRandomModal } from "./SavedRandomModal";

interface SavedFoodsPageContentProps {
  initialRecords: SavedFoodRecord[];
  allFoods: Food[];
}

export function SavedFoodsPageContent({ initialRecords, allFoods }: SavedFoodsPageContentProps) {
  const totalCategoriesAvailable = new Set(allFoods.flatMap((food) => food.categories.map((c) => c.id)))
    .size;

  const {
    saved,
    visibleSaved,
    stats,
    categoryCounts,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    sortOrder,
    setSortOrder,
    unsave,
    modalFood,
    isModalOpen,
    isRerolling,
    openModalWithFood,
    openRandomModal,
    rerollModal,
    confirmModal,
    closeModal,
    isEmpty,
    hasNoFilterMatch,
  } = useSavedFoods({ initialRecords, allFoods, totalCategoriesAvailable });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-pink text-primary-pink text-xs font-bold uppercase tracking-wider mb-2">
            <Heart className="size-3.5" fill="currentColor" aria-hidden />
            <span>Bộ sưu tập ẩm thực riêng bạn</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Món đã lưu
          </h1>
          <p className="text-text-secondary mt-1">
            Những món ăn bạn muốn ghi nhớ và ưu tiên cho các lần random kế tiếp.
          </p>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={openRandomModal}
            className="group inline-flex items-center gap-2 h-12 px-5 rounded-full bg-primary-blue text-white font-semibold shadow-md hover:shadow-xl hover:bg-[#4a8ddb] transition-all active:scale-95 self-start md:self-auto"
          >
            <Dices className="size-5 group-hover:rotate-180 transition-transform duration-500" aria-hidden />
            <span>Random từ danh sách đã lưu</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-surface/20 text-xs font-semibold">
              {saved.length}
            </span>
          </button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Heart}
          title="Bạn chưa lưu món ăn nào"
          description='Nhấn vào biểu tượng trái tim khi random để thêm món vào danh sách yêu thích.'
          action={
            <Button href="/random" leftIcon={<Dices className="size-4" aria-hidden />}>
              Khám phá món ngay
            </Button>
          }
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MiniStat icon={Heart} label="Tổng món đã lưu" value={`${stats.totalCount} món`} tone="pink" />
            <MiniStat
              icon={Flame}
              label="Mức calo trung bình"
              value={stats.avgCalories !== null ? `~ ${stats.avgCalories} kcal` : "Chưa cập nhật"}
              tone="blue"
            />
            <MiniStat icon={Wallet} label="Khoảng giá phổ biến" value={stats.priceRangeLabel} tone="blue" />
            <MiniStat icon={Layers} label="Đa dạng danh mục" value={stats.categoryDiversityLabel} tone="pink" />
          </div>

          {/* Filter bar */}
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3 mb-8">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm món trong danh sách lưu..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-soft-blue/40 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:bg-soft-blue transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="saved-sort" className="text-sm text-text-secondary hidden sm:inline-block">
                  Sắp xếp:
                </label>
                <select
                  id="saved-sort"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="h-11 px-3 rounded-xl bg-soft-blue/40 text-text-primary text-sm appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="recent">Mới lưu gần đây</option>
                  <option value="name-asc">Tên A → Z</option>
                  <option value="price-asc">Giá thấp → cao</option>
                  <option value="price-desc">Giá cao → thấp</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <CategoryPill active={categoryId === "all"} onClick={() => setCategoryId("all")}>
                Tất cả ({saved.length})
              </CategoryPill>
              {[...categoryCounts.entries()].map(([id, { name, count }]) => (
                <CategoryPill key={id} active={categoryId === id} onClick={() => setCategoryId(id)}>
                  {name} ({count})
                </CategoryPill>
              ))}
            </div>
          </div>

          {/* Grid */}
          {hasNoFilterMatch ? (
            <EmptyState
              icon={Search}
              title="Không tìm thấy món phù hợp"
              description="Thử đổi từ khoá tìm kiếm hoặc danh mục khác."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleSaved.map((item, index) => (
                <div
                  key={item.foodId}
                  className="animate-fade-slide-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <FoodCard
                    food={item.food}
                    savedAt={item.savedAt}
                    onUnsave={unsave}
                    onPick={openModalWithFood}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SavedRandomModal
        isOpen={isModalOpen}
        food={modalFood}
        isRerolling={isRerolling}
        onConfirm={confirmModal}
        onReroll={rerollModal}
        onClose={closeModal}
      />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
  tone: "blue" | "pink";
}) {
  return (
    <div className="bg-surface rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          tone === "pink" ? "bg-soft-pink text-primary-pink" : "bg-soft-blue text-primary-blue"
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-text-secondary truncate">{label}</div>
        <div className="font-bold text-text-primary truncate">{value}</div>
      </div>
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-primary-blue text-white shadow-sm transition-all"
          : "shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-soft-blue/50 text-text-secondary hover:bg-soft-blue transition-all"
      }
    >
      {children}
    </button>
  );
}

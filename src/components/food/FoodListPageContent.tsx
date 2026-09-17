"use client";

import type { ReactNode } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { EATING_LEVEL_LABELS, EATING_LEVEL_ORDER } from "@/constants/categories";
import { useFoodList } from "@/features/food-list/useFoodList";
import { EmptyState } from "@/components/ui/EmptyState";
import { FoodListCard } from "./FoodListCard";

interface FoodListPageContentProps {
  initialFoods: Food[];
}

export function FoodListPageContent({ initialFoods }: FoodListPageContentProps) {
  const {
    search,
    setSearch,
    eatingLevel,
    setEatingLevel,
    categoryId,
    setCategoryId,
    categoryOptions,
    eatingLevelCounts,
    filteredFoods,
    isSystemEmpty,
    hasNoFilterMatch,
  } = useFoodList({ initialFoods });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-1.5 text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
          <UtensilsCrossed className="size-4" aria-hidden />
          <span>Kho ẩm thực Cần Thơ</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
          Danh sách món ăn
        </h1>
        <p className="text-text-secondary mt-1">
          {isSystemEmpty
            ? "Hệ thống chưa có món ăn nào được duyệt công khai."
            : `Hiện có ${initialFoods.length} món ăn đang được phục vụ ngẫu nhiên trong hệ thống.`}
        </p>
      </div>

      {isSystemEmpty ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Chưa có món ăn nào"
          description="Món ăn được cộng đồng đóng góp và kiểm duyệt sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm món ăn theo tên, mô tả, quán..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-soft-blue/40 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:bg-soft-blue transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <FilterPill active={eatingLevel === "all"} onClick={() => setEatingLevel("all")}>
                Tất cả ({initialFoods.length})
              </FilterPill>
              {EATING_LEVEL_ORDER.filter((level) => (eatingLevelCounts.get(level) ?? 0) > 0).map(
                (level) => (
                  <FilterPill
                    key={level}
                    active={eatingLevel === level}
                    onClick={() => setEatingLevel(level)}
                  >
                    {EATING_LEVEL_LABELS[level]} ({eatingLevelCounts.get(level) ?? 0})
                  </FilterPill>
                ),
              )}
            </div>

            {categoryOptions.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <FilterPill active={categoryId === "all"} onClick={() => setCategoryId("all")} tone="pink">
                  Mọi danh mục
                </FilterPill>
                {categoryOptions.map((category) => (
                  <FilterPill
                    key={category.id}
                    active={categoryId === category.id}
                    onClick={() => setCategoryId(category.id)}
                    tone="pink"
                  >
                    {category.name} ({category.count})
                  </FilterPill>
                ))}
              </div>
            )}
          </div>

          {hasNoFilterMatch ? (
            <EmptyState
              icon={Search}
              title="Không tìm thấy món phù hợp"
              description="Thử đổi từ khoá tìm kiếm hoặc bộ lọc khác."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredFoods.map((food, index) => (
                <div
                  key={food.id}
                  className="animate-fade-slide-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <FoodListCard food={food} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  tone = "blue",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "blue" | "pink";
  children: ReactNode;
}) {
  const activeClasses =
    tone === "pink" ? "bg-primary-pink text-white shadow-sm" : "bg-primary-blue text-white shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeClasses}`
          : "shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-soft-blue/50 text-text-secondary hover:bg-soft-blue transition-all"
      }
    >
      {children}
    </button>
  );
}

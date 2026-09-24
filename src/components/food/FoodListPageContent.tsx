"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Dices, PlusCircle, Search, Soup, UtensilsCrossed } from "lucide-react";
import type { EatingLevel, Food } from "@/types/food";
import { EATING_LEVELS, EATING_LEVEL_LABELS, EATING_LEVEL_ORDER } from "@/constants/categories";
import { useFoodList } from "@/features/food-list/useFoodList";
import { EmptyState } from "@/components/ui/EmptyState";
import { FoodListCard } from "./FoodListCard";

interface FoodListPageContentProps {
  initialFoods: Food[];
  initialEatingLevel?: EatingLevel;
}

export function FoodListPageContent({ initialFoods, initialEatingLevel }: FoodListPageContentProps) {
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
  } = useFoodList({ initialFoods, initialEatingLevel });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 space-y-8">
      {/* Hero */}
      <header className="relative rounded-3xl p-6 md:p-10 overflow-hidden bg-gradient-to-br from-surface via-primary-soft/40 to-accent-soft/40 shadow-sm">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-16 left-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface text-primary text-xs font-bold uppercase tracking-wider shadow-sm mb-3">
              <UtensilsCrossed className="size-3.5" aria-hidden />
              <span>Kho ẩm thực Cần Thơ</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-2">
              Danh sách món ăn hệ thống
            </h1>
            <p className="text-text-secondary leading-relaxed">
              {isSystemEmpty
                ? "Hệ thống chưa có món ăn nào được duyệt công khai."
                : `Hơn ${initialFoods.length} món ăn đang chờ được quay ngẫu nhiên hoặc ghim vào thực đơn yêu thích của bạn.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface text-text-secondary shadow-sm">
              <span className="size-2.5 rounded-full bg-primary animate-pulse" aria-hidden />
              <span className="text-sm font-semibold text-text-primary">{initialFoods.length} món sẵn sàng</span>
            </div>
            <Link
              href="/random"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary-strong hover:bg-primary-strong-hover text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Dices className="size-4.5" aria-hidden />
              <span>Random ngay món ngẫu nhiên</span>
            </Link>
            <Link
              href="/mon-an/dong-gop"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-surface hover:bg-accent-soft text-accent-ink text-sm font-semibold shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="size-4.5" aria-hidden />
              <span>Đóng góp món mới</span>
            </Link>
          </div>
        </div>
      </header>

      {!isSystemEmpty && (
        <section aria-label="Tổng quan số lượng món theo mức độ ăn" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={Soup} label="Tổng kho ẩm thực" value={`${initialFoods.length} món`} tone="blue" />
          {EATING_LEVELS.map((level) => (
            <MetricCard
              key={level.id}
              icon={level.icon}
              label={level.label}
              value={`${eatingLevelCounts.get(level.id) ?? 0} món`}
              tone="pink"
            />
          ))}
        </section>
      )}

      {isSystemEmpty ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Chưa có món ăn nào"
          description="Món ăn được cộng đồng đóng góp và kiểm duyệt sẽ xuất hiện tại đây."
          action={
            <Link
              href="/mon-an/dong-gop"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary-strong hover:bg-primary-strong-hover text-white text-sm font-semibold shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="size-4.5" aria-hidden />
              <span>Đóng góp món đầu tiên</span>
            </Link>
          }
        />
      ) : (
        <>
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm món ăn theo tên, mô tả, quán..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-primary-soft/40 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:bg-primary-soft transition-colors"
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

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Soup;
  label: string;
  value: string;
  tone: "blue" | "pink";
}) {
  const toneClasses = tone === "blue" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent-ink";

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneClasses}`}>
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary truncate">{label}</p>
        <p className="font-heading font-semibold text-text-primary tracking-tight">{value}</p>
      </div>
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
    tone === "pink" ? "bg-accent-strong text-white shadow-sm" : "bg-primary-strong text-white shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeClasses}`
          : "shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-primary-soft/50 text-text-secondary hover:bg-primary-soft transition-all"
      }
    >
      {children}
    </button>
  );
}

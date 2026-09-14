"use client";

import {
  BookmarkCheck,
  CheckCircle2,
  Dices,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { HistoryEntry } from "@/types/history";
import type { Food } from "@/types/food";
import { useHistoryLog } from "@/features/history-log/useHistoryLog";
import { HUNGER_LEVELS } from "@/constants/categories";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistoryTimelineItem } from "./HistoryTimelineItem";
import { HistoryStatsSidebar } from "./HistoryStatsSidebar";

interface HistoryPageContentProps {
  initialEntries: HistoryEntry[];
  allFoods: Food[];
  totalFoodsInMenu: number;
}

export function HistoryPageContent({
  initialEntries,
  allFoods,
  totalFoodsInMenu,
}: HistoryPageContentProps) {
  const {
    groups,
    stats,
    hungerBreakdown,
    topMealTimeInsight,
    counts,
    removingIds,
    search,
    setSearch,
    hungerLevel,
    setHungerLevel,
    quickFilter,
    setQuickFilter,
    sortOrder,
    setSortOrder,
    removeEntry,
    clearAll,
    toggleSaved,
    isEmpty,
    hasNoFilterMatch,
  } = useHistoryLog({ initialEntries, allFoods, totalFoodsInMenu });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
            <UtensilsCrossed className="size-3.5" aria-hidden />
            <span>Nhật ký ẩm thực cá nhân</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Lịch sử ăn uống
          </h1>
          <p className="text-text-secondary mt-1">
            Xem lại những lựa chọn bạn đã random theo từng ngày.
          </p>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Xoá toàn bộ lịch sử ăn uống? Thao tác này không thể hoàn tác.")) {
                clearAll();
              }
            }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white hover:bg-red-50 text-red-600 text-sm font-medium shadow-sm transition-all active:scale-95 self-start md:self-auto"
          >
            <Trash2 className="size-4" aria-hidden />
            <span>Xoá toàn bộ lịch sử</span>
          </button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Dices}
          title="Chưa có lịch sử nào"
          description="Random món đầu tiên để bắt đầu nhật ký ăn uống của bạn."
          action={
            <Button href="/random" leftIcon={<Dices className="size-4" aria-hidden />}>
              Bắt đầu random ngay
            </Button>
          }
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Dices}
              label="Tổng số lần random"
              value={`${stats.totalCount}`}
              suffix="lượt"
            />
            <StatCard
              icon={BookmarkCheck}
              label="Món đã lưu"
              value={`${stats.savedCount}`}
              suffix="món yêu thích"
              hint={`Chiếm ${stats.savedPercentOfMenu}% tổng thực đơn`}
            />
            <StatCard
              icon={UtensilsCrossed}
              label="Chế độ ăn nhiều nhất"
              value={stats.topHungerLevelLabel ?? "—"}
              hint={`${stats.topHungerLevelPercent}% các lần random`}
            />
            <StatCard
              icon={CheckCircle2}
              label="Tỷ lệ đã ăn"
              value={`${stats.eatenPercent}%`}
              hint={`${stats.eatenCount}/${stats.totalCount} lần đã xác nhận`}
            />
          </div>

          {/* Filter toolbar */}
          <div className="p-4 rounded-xl bg-white shadow-sm mb-8 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-6 relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary"
                  aria-hidden
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm món đã ăn (vd: Cơm tấm, Phở, Trà sữa)..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-soft-blue/40 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:bg-soft-blue transition-colors"
                />
              </div>
              <div className="md:col-span-4 relative">
                <select
                  value={hungerLevel}
                  onChange={(e) => setHungerLevel(e.target.value as typeof hungerLevel)}
                  className="w-full h-11 px-4 rounded-xl bg-soft-blue/40 text-text-primary text-sm appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả chế độ</option>
                  {HUNGER_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="w-full h-11 px-3 rounded-xl bg-soft-blue/40 text-text-primary text-sm appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="newest">Mới nhất trước</option>
                  <option value="oldest">Cũ nhất trước</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-text-secondary mr-1">Bộ lọc nhanh:</span>
              <QuickFilterChip
                active={quickFilter === "all"}
                onClick={() => setQuickFilter("all")}
                label={`Tất cả (${counts.all})`}
              />
              <QuickFilterChip
                active={quickFilter === "saved"}
                onClick={() => setQuickFilter("saved")}
                label={`Đã lưu ⭐ (${counts.saved})`}
              />
              <QuickFilterChip
                active={quickFilter === "eaten"}
                onClick={() => setQuickFilter("eaten")}
                label={`Đã ăn xong ✓ (${counts.eaten})`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Timeline */}
            <div className="lg:col-span-8 space-y-8">
              {hasNoFilterMatch ? (
                <EmptyState
                  icon={Search}
                  title="Không tìm thấy món phù hợp"
                  description="Thử đổi từ khoá tìm kiếm hoặc bộ lọc khác."
                />
              ) : (
                groups.map((group) => (
                  <div key={group.dateKey} className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-blue" />
                        <h2 className="text-lg font-semibold text-text-primary">{group.label}</h2>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-soft-blue text-primary-blue text-xs font-semibold">
                        {group.entries.length} lần random
                      </span>
                    </div>
                    {group.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="animate-fade-slide-up"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <HistoryTimelineItem
                          entry={entry}
                          isRemoving={removingIds.has(entry.id)}
                          onToggleSaved={toggleSaved}
                          onRemove={removeEntry}
                        />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4">
              <HistoryStatsSidebar
                totalCount={stats.totalCount}
                breakdown={hungerBreakdown}
                topMealTimeInsight={topMealTimeInsight}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
}: {
  icon: typeof Dices;
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-text-secondary">{label}</span>
        <div className="w-8 h-8 rounded-full bg-soft-blue flex items-center justify-center text-primary-blue">
          <Icon className="size-4" aria-hidden />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-text-primary truncate">{value}</span>
        {suffix && <span className="text-sm text-text-secondary">{suffix}</span>}
      </div>
      {hint && <div className="mt-1.5 text-xs text-text-secondary">{hint}</div>}
    </div>
  );
}

function QuickFilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "px-3 py-1 rounded-full bg-primary-blue text-white text-xs font-semibold shadow-sm transition-all"
          : "px-3 py-1 rounded-full bg-soft-blue/50 text-text-secondary hover:bg-soft-blue text-xs font-medium transition-all"
      }
    >
      {label}
    </button>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Clock,
  Lightbulb,
  MapPin,
  MapPinPlus,
  NotebookPen,
  PenLine,
  PlusCircle,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CONTRIBUTIONS_PAGE_SIZE, useContributions } from "@/features/contributions/useContributions";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContributionCard } from "@/components/food/ContributionCard";
import { ContributionDetailModal } from "@/components/food/ContributionDetailModal";
import { ContributionEditModal } from "@/components/food/ContributionEditModal";
import { ContributorLevelCard } from "@/components/food/ContributorLevelCard";
import type {
  AchievementStatus,
  Contribution,
  ContributionSort,
  ContributionSummary,
  ContributionTab,
} from "@/types/contribution";

interface ContributionsPageContentProps {
  initialContributions: Contribution[];
  initialAchievements: AchievementStatus[];
  categories: { id: string; name: string }[];
}

const TABS: { id: ContributionTab; label: string; count: (summary: ContributionSummary) => number }[] = [
  { id: "all", label: "Tất cả", count: (s) => s.total },
  { id: "approved", label: "Đã duyệt", count: (s) => s.approved },
  { id: "pending", label: "Đang kiểm duyệt", count: (s) => s.pending },
  { id: "needs_revision", label: "Cần chỉnh sửa", count: (s) => s.needsRevision },
  { id: "rejected", label: "Bị từ chối", count: (s) => s.rejected },
];

const SORT_OPTIONS: { id: ContributionSort; label: string }[] = [
  { id: "newest", label: "Mới nhất trước" },
  { id: "oldest", label: "Cũ nhất trước" },
  { id: "most_saved", label: "Nhiều lượt lưu nhất" },
  { id: "top_rated", label: "Đánh giá cao nhất" },
];

const TIPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Camera, title: "Ảnh thật, chụp ban ngày", text: "Bắt trọn màu sắc thật của món, hạn chế lọc màu quá đà." },
  { icon: MapPin, title: "Định vị chính xác", text: "Ghi rõ số nhà, tên hẻm và ghim đúng vị trí trên bản đồ." },
  { icon: NotebookPen, title: "Mô tả hương vị", text: "Nêu độ ngọt, độ giòn, vị cay đặc trưng để gợi ý đúng người." },
];

export function ContributionsPageContent({ initialContributions, initialAchievements, categories }: ContributionsPageContentProps) {
  const {
    contributions,
    summary,
    levelProgress,
    achievements,
    visible,
    filteredCount,
    tab,
    setTab,
    search,
    setSearch,
    sort,
    setSort,
    page,
    setPage,
    totalPages,
    refresh,
  } = useContributions(initialContributions, initialAchievements);

  const [detailTarget, setDetailTarget] = useState<Contribution | null>(null);
  const [editTarget, setEditTarget] = useState<Contribution | null>(null);

  const approvalRate = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;
  const firstContributedAt = contributions.reduce<string | null>(
    (earliest, item) => (earliest === null || item.createdAt < earliest ? item.createdAt : earliest),
    null,
  );
  const rangeStart = filteredCount === 0 ? 0 : (page - 1) * CONTRIBUTIONS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * CONTRIBUTIONS_PAGE_SIZE, filteredCount);

  function startEdit(contribution: Contribution) {
    setDetailTarget(null);
    setEditTarget(contribution);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-text-primary font-medium">Món đã đóng góp</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <ChefHat className="size-3.5" aria-hidden />
              <span>Đóng góp cho cộng đồng</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Món đã đóng góp</h1>
            <p className="text-text-secondary mt-1">
              Theo dõi tiến độ kiểm duyệt, đọc phản hồi và chỉnh sửa những món ăn, quán ngon bạn đã chia sẻ.
            </p>
          </div>
          <Button href="/mon-an/dong-gop" leftIcon={<PlusCircle className="size-4" aria-hidden />} className="self-start lg:self-auto">
            Đóng góp món ăn mới
          </Button>
        </div>
      </header>

      {/* Số liệu thật tính từ DB — không có số liệu giả */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Thống kê đóng góp">
        <StatCard
          icon={UtensilsCrossed}
          label="Tổng món đã gửi"
          value={summary.total}
          unit="món"
          hint={firstContributedAt ? `Từ ${formatDate(firstContributedAt)}` : "Chưa có đóng góp nào"}
          accent="text-primary bg-primary-soft"
        />
        <StatCard
          icon={CheckCircle2}
          label="Đã lên thực đơn"
          value={summary.approved}
          unit="món"
          hint={summary.total > 0 ? `Tỷ lệ duyệt ${approvalRate}%` : "—"}
          accent="text-success bg-success/15"
        />
        <StatCard
          icon={Clock}
          label="Đang kiểm duyệt"
          value={summary.pending}
          unit="hồ sơ"
          hint="FoodReviewer đang xử lý"
          accent="text-primary bg-primary-soft"
        />
        <StatCard
          icon={PenLine}
          label="Cần chỉnh sửa"
          value={summary.needsRevision}
          unit="hồ sơ"
          hint={summary.needsRevision > 0 ? "Sửa & nộp lại để được duyệt" : "Không có hồ sơ nào cần sửa"}
          accent="text-[#8a690b] bg-warning/20"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Bộ lọc */}
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-background overflow-x-auto" role="tablist">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                    tab === item.id ? "bg-surface shadow-sm text-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {item.label} ({item.count(summary)})
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên món, tên quán hoặc địa chỉ..."
                  aria-label="Tìm đóng góp"
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ContributionSort)}
                aria-label="Sắp xếp"
                className="h-10 px-3 rounded-xl bg-background text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-52"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Danh sách */}
          {contributions.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="Bạn chưa đóng góp món nào"
              description="Chia sẻ một quán ngon bạn biết — sau khi được duyệt, món sẽ xuất hiện trong Random cho mọi người."
              action={
                <Button href="/mon-an/dong-gop" leftIcon={<PlusCircle className="size-4" aria-hidden />}>
                  Đóng góp món đầu tiên
                </Button>
              }
            />
          ) : filteredCount === 0 ? (
            <EmptyState icon={Search} title="Không tìm thấy đóng góp phù hợp" description="Thử đổi từ khoá hoặc chọn nhóm trạng thái khác." />
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((contribution) => (
                <ContributionCard key={contribution.id} contribution={contribution} onOpenDetail={setDetailTarget} onEdit={startEdit} />
              ))}
            </div>
          )}

          {filteredCount > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-text-secondary">
                Hiển thị {rangeStart} – {rangeEnd} trong tổng số {filteredCount} đóng góp
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    aria-label="Trang trước"
                    className="size-9 rounded-full bg-background text-text-secondary flex items-center justify-center hover:bg-primary-soft disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <span className="px-2 text-sm font-semibold text-text-primary">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    aria-label="Trang sau"
                    className="size-9 rounded-full bg-background text-text-secondary flex items-center justify-center hover:bg-primary-soft disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-4">
          <ContributorLevelCard levelProgress={levelProgress} achievements={achievements} />

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb className="size-5" aria-hidden />
              <h3 className="font-heading font-semibold text-text-primary">Bí quyết để được duyệt</h3>
            </div>
            <ul className="flex flex-col gap-3">
              {TIPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-2.5">
                  <Icon className="size-4 shrink-0 mt-0.5 text-primary" aria-hidden />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">{title}:</strong> {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-secondary text-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <h3 className="font-heading font-semibold text-lg leading-snug">Biết một quán ăn ít người biết?</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Chia sẻ để mọi người có thêm lựa chọn cho bữa ăn hôm nay.
            </p>
            <Link
              href="/mon-an/dong-gop"
              className="h-10 rounded-full bg-surface text-secondary-strong dark:text-text-primary text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-primary-soft active:scale-95 transition-all"
            >
              <MapPinPlus className="size-4" aria-hidden />
              Đóng góp địa điểm ngay
            </Link>
          </div>
        </aside>
      </div>

      <ContributionDetailModal contribution={detailTarget} onClose={() => setDetailTarget(null)} onEdit={startEdit} />
      <ContributionEditModal
        contribution={editTarget}
        categories={categories}
        onClose={() => setEditTarget(null)}
        onSubmitted={refresh}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className={cn("size-9 rounded-full flex items-center justify-center", accent)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-heading font-bold text-text-primary">{value}</span>
        <span className="text-sm text-text-secondary">{unit}</span>
      </div>
      <p className="text-xs text-text-secondary">{hint}</p>
    </div>
  );
}

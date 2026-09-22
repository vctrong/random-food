"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CalendarClock, History, Search, Timer, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DecisionBadge } from "@/components/reviewer/DecisionBadge";
import { cn, formatDateTime, formatDurationMinutes, formatPriceRange } from "@/lib/utils";
import type { ReviewHistoryEntry, ReviewHistorySummary, ReviewHistoryStatusFilter } from "@/types/reviewer";

interface ReviewerHistoryContentProps {
  initialEntries: ReviewHistoryEntry[];
  initialTotal: number;
  initialSummary: ReviewHistorySummary;
  pageSize: number;
}

const STATUS_TABS: { id: ReviewHistoryStatusFilter; label: (summary: ReviewHistorySummary) => string }[] = [
  { id: "all", label: (s) => `Tất cả (${s.total})` },
  { id: "approved", label: (s) => `Đã duyệt (${s.approved})` },
  { id: "needs_revision", label: (s) => `Cần sửa (${s.needsRevision})` },
  { id: "rejected", label: (s) => `Từ chối (${s.rejected})` },
];

export function ReviewerHistoryContent({ initialEntries, initialTotal, initialSummary, pageSize }: ReviewerHistoryContentProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [summary, setSummary] = useState(initialSummary);
  const [status, setStatus] = useState<ReviewHistoryStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ReviewHistoryEntry | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ status, search, page: String(page) });
        const response = await fetch(`/api/reviewer/history?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setEntries(data.entries);
        setTotal(data.total);
        setSummary(data.summary);
      } catch {
        // request bị huỷ do đổi filter liên tục — bỏ qua.
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [status, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const approvalRate = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-subheading font-bold text-text-primary">Nhật ký thẩm định cá nhân</h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Theo dõi minh bạch các quyết định phê duyệt/từ chối/yêu cầu sửa mà bạn đã đưa ra (BR-F09).
        </p>
      </div>

      {/* Bento stats — số thật tính từ AuditLog, không có số liệu giả */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={History} label="Tổng hồ sơ đã xử lý" value={String(summary.total)} accent="text-primary-blue" />
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Tỷ lệ phê duyệt</span>
            <TrendingUp className="size-5 text-primary-blue" aria-hidden />
          </div>
          <span className="text-3xl font-subheading font-bold text-text-primary">{approvalRate}%</span>
          <div className="w-full h-2 rounded-full bg-cream flex overflow-hidden gap-0.5">
            {summary.total > 0 && (
              <>
                <div className="bg-success h-full" style={{ width: `${(summary.approved / summary.total) * 100}%` }} />
                <div className="bg-warning h-full" style={{ width: `${(summary.needsRevision / summary.total) * 100}%` }} />
                <div className="bg-primary-pink h-full" style={{ width: `${(summary.rejected / summary.total) * 100}%` }} />
              </>
            )}
          </div>
        </div>
        <StatCard
          icon={Timer}
          label="Thời gian xử lý trung bình"
          value={summary.avgProcessingMinutes !== null ? formatDurationMinutes(summary.avgProcessingMinutes) : "—"}
          accent="text-primary-pink"
        />
        <StatCard icon={CalendarClock} label="Xử lý trong 7 ngày qua" value={String(summary.last7Days)} accent="text-deep-blue" />
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm theo tên món/quán, người gửi, mã hồ sơ..."
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-cream overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatus(tab.id);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  status === tab.id ? "bg-surface shadow-sm text-primary-blue" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {tab.label(summary)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title={isLoading ? "Đang tải..." : "Chưa có bản ghi nào"}
            description="Lịch sử thẩm định của bạn sẽ hiện ở đây sau khi bạn duyệt/từ chối nội dung."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-cream text-text-secondary text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[260px]">Món / Quán ăn</th>
                  <th className="py-3 px-4 min-w-[150px]">Phân loại &amp; giá</th>
                  <th className="py-3 px-4 min-w-[120px]">Quyết định</th>
                  <th className="py-3 px-4 min-w-[150px]">Thời gian xử lý</th>
                  <th className="py-3 px-4 min-w-[260px]">Ghi chú / Lý do</th>
                </tr>
              </thead>
              <tbody className="text-sm text-text-primary">
                {entries.map((entry) => (
                  <tr
                    key={entry.logId}
                    onClick={() => setDetailEntry(entry)}
                    className="border-t border-border hover:bg-cream/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 rounded-xl overflow-hidden shrink-0 bg-soft-blue flex items-center justify-center">
                          {entry.images[0] ? (
                            <Image src={entry.images[0]} alt="" fill sizes="44px" className="object-cover" />
                          ) : (
                            <UtensilsCrossed className="size-5 text-primary-blue/60" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{entry.name}</p>
                          <p className="text-xs text-text-secondary truncate">Bởi: {entry.submitter.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {entry.categoryNames[0] && (
                          <span className="px-2 py-0.5 rounded-full bg-soft-blue text-primary-blue text-[11px] font-medium">
                            {entry.categoryNames[0]}
                          </span>
                        )}
                        {entry.priceMin !== null && entry.priceMax !== null && (
                          <span className="text-xs font-medium text-text-primary">
                            {formatPriceRange(entry.priceMin, entry.priceMax)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <DecisionBadge decision={entry.decision} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{formatDateTime(entry.decidedAt)}</span>
                        {entry.processingMinutes !== null && (
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <Timer className="size-3" aria-hidden /> {formatDurationMinutes(entry.processingMinutes)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-text-secondary line-clamp-2 max-w-sm">
                        {entry.reason ?? "Không có ghi chú."}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
            <p className="text-xs text-text-secondary">
              Trang <span className="font-semibold text-text-primary">{page}</span> / {totalPages} — tổng{" "}
              <span className="font-semibold text-text-primary">{total}</span> bản ghi
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-text-secondary hover:bg-cream disabled:opacity-40 disabled:pointer-events-none"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-text-secondary hover:bg-cream disabled:opacity-40 disabled:pointer-events-none"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={detailEntry !== null} onClose={() => setDetailEntry(null)} panelClassName="max-w-lg p-6">
        {detailEntry && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pr-8">
              <DecisionBadge decision={detailEntry.decision} />
              <span className="text-xs text-text-secondary">{formatDateTime(detailEntry.decidedAt)}</span>
            </div>
            <h3 className="text-lg font-subheading font-semibold text-text-primary">{detailEntry.name}</h3>
            <p className="text-xs text-text-secondary">
              Người gửi: <span className="font-medium text-text-primary">{detailEntry.submitter.name}</span>
              {detailEntry.submittedAt && ` • Gửi lúc ${formatDateTime(detailEntry.submittedAt)}`}
            </p>
            <div className="p-4 rounded-2xl bg-cream flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Ghi chú thẩm định</span>
              <p className="text-sm text-text-primary leading-relaxed">{detailEntry.reason ?? "Không có ghi chú."}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof History;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <Icon className={cn("size-5", accent)} aria-hidden />
      </div>
      <span className="text-3xl font-subheading font-bold text-text-primary">{value}</span>
    </div>
  );
}

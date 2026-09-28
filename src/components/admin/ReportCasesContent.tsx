"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, MessageSquareWarning, Store, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { ReportCaseDetailPanel } from "@/components/admin/ReportCaseDetailPanel";
import { cn, formatRelativeTime } from "@/lib/utils";
import { REPORT_CASE_ACTION_LABELS, REPORT_REASON_LABELS, type ReportCaseStatus, type ReportTargetType } from "@/constants/reports";
import type { AdminReportCaseDetail, AdminReportCaseRow } from "@/types/admin";

type TypeFilter = "all" | ReportTargetType;

const TYPE_OPTIONS: SelectMenuOption<TypeFilter>[] = [
  { value: "all", label: "Tất cả loại" },
  { value: "review", label: "Đánh giá" },
  { value: "food", label: "Món ăn" },
  { value: "restaurant", label: "Quán ăn" },
];

const STATUS_OPTIONS: SelectMenuOption<ReportCaseStatus>[] = [
  { value: "pending", label: "Đang chờ" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "dismissed", label: "Đã bỏ qua" },
];

const TARGET_META: Record<ReportTargetType, { label: string; icon: typeof Flag }> = {
  review: { label: "Đánh giá", icon: MessageSquareWarning },
  food: { label: "Món ăn", icon: UtensilsCrossed },
  restaurant: { label: "Quán ăn", icon: Store },
};

const STATUS_BADGE: Record<ReportCaseStatus, { label: string; variant: "warning" | "success" | "neutral" }> = {
  pending: { label: "Đang chờ", variant: "warning" },
  resolved: { label: "Đã xử lý", variant: "success" },
  dismissed: { label: "Đã bỏ qua", variant: "neutral" },
};

/** Trang /admin/bao-cao — CHỈ Admin xử lý báo cáo (BR-A09). */
export function ReportCasesContent({ initialCases }: { initialCases: AdminReportCaseRow[] }) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [status, setStatus] = useState<ReportCaseStatus>("pending");
  const [type, setType] = useState<TypeFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialCases[0]?.id ?? null);
  const [detail, setDetail] = useState<AdminReportCaseDetail | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error">("idle");

  const loadCases = useCallback(async (nextStatus: ReportCaseStatus, nextType: TypeFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: nextStatus });
      if (nextType !== "all") params.set("type", nextType);
      const response = await fetch(`/api/admin/report-cases?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const rows = (await response.json()) as AdminReportCaseRow[];
        setCases(rows);
        setSelectedId((current) => (rows.some((row) => row.id === current) ? current : (rows[0]?.id ?? null)));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailState("loading");
    try {
      const response = await fetch(`/api/admin/report-cases/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("detail");
      setDetail((await response.json()) as AdminReportCaseDetail);
      setDetailState("idle");
    } catch {
      setDetailState("error");
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải chi tiết khi đổi case đang chọn
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const counts = useMemo(() => cases.length, [cases]);

  async function handleResolved() {
    await loadCases(status, type);
    if (selectedId) await loadDetail(selectedId);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">Xử lý báo cáo</h1>
        <p className="text-sm text-text-secondary">
          Mỗi case gom mọi báo cáo của 1 nội dung · case nhiều lượt báo cáo được xếp lên trước.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <section className="xl:col-span-5 flex flex-col gap-3 min-w-0">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <SelectMenu
              value={status}
              onChange={(value) => {
                setStatus(value);
                void loadCases(value, type);
              }}
              options={STATUS_OPTIONS}
              placeholder="Trạng thái"
              label="Lọc theo trạng thái"
            />
            <SelectMenu
              value={type}
              onChange={(value) => {
                setType(value);
                void loadCases(status, value);
              }}
              options={TYPE_OPTIONS}
              placeholder="Loại"
              label="Lọc theo loại nội dung"
            />
          </div>

          <p className="px-1 text-xs text-text-secondary" aria-live="polite">
            {isLoading ? "Đang tải…" : `${counts} case`}
          </p>

          {cases.length === 0 && !isLoading ? (
            <EmptyState icon={Flag} title="Không có case nào" description="Chưa có báo cáo nào khớp bộ lọc này." />
          ) : (
            <ul className={cn("flex flex-col gap-2.5 transition-opacity", isLoading && "opacity-60")}>
              {cases.map((item) => {
                const meta = TARGET_META[item.targetType];
                const Icon = meta.icon;
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={active || undefined}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border bg-surface p-4 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active ? "border-primary shadow-md" : "border-border hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                          <Icon className="size-3.5" aria-hidden />
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-text-secondary whitespace-nowrap">{formatRelativeTime(item.updatedAt)}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-text-primary line-clamp-2 break-words">
                        {item.targetLabel ?? "Nội dung đã bị xoá"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="pink">{item.reportCount} báo cáo</Badge>
                        {item.reasonCounts.slice(0, 2).map((entry) => (
                          <Badge key={entry.reason} variant="neutral">
                            {REPORT_REASON_LABELS[entry.reason]} · {entry.count}
                          </Badge>
                        ))}
                        {item.status !== "pending" && (
                          <Badge variant={STATUS_BADGE[item.status].variant}>
                            {item.action ? REPORT_CASE_ACTION_LABELS[item.action] : STATUS_BADGE[item.status].label}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="xl:col-span-7 min-w-0">
          {!selectedId ? (
            <EmptyState icon={Flag} title="Chọn 1 case" description="Chọn 1 case ở danh sách để xem chi tiết và xử lý." />
          ) : detailState === "error" ? (
            <EmptyState icon={Flag} title="Không tải được case" description="Thử chọn lại case hoặc tải lại trang." />
          ) : !detail || detailState === "loading" ? (
            <div className="h-96 rounded-3xl border border-border bg-surface animate-skeleton" aria-busy="true" aria-label="Đang tải chi tiết" />
          ) : (
            <ReportCaseDetailPanel key={detail.id} detail={detail} onResolved={() => void handleResolved()} />
          )}
        </section>
      </div>
    </div>
  );
}


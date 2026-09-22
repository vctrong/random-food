"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, EyeOff, Flag, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { REPORT_TARGET_LABELS } from "@/constants/admin";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { AdminReportRow, ReportAction } from "@/types/admin";

interface ReportsContentProps {
  initialReports: AdminReportRow[];
}

type StatusFilter = "pending" | "reviewed" | "all";

const ACTION_OPTIONS: { action: ReportAction; label: string; icon: typeof ShieldCheck }[] = [
  { action: "keep", label: "Giữ nguyên (bác bỏ)", icon: ShieldCheck },
  { action: "hide", label: "Ẩn nội dung", icon: EyeOff },
  { action: "remove", label: "Gỡ nội dung", icon: Trash2 },
  { action: "warn_user", label: "Cảnh cáo người đăng", icon: ShieldAlert },
  { action: "ban_user", label: "Khoá tài khoản người đăng", icon: Ban },
];

export function ReportsContent({ initialReports }: ReportsContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [reports, setReports] = useState(initialReports);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialReports.find((r) => r.status === "pending")?.id ?? initialReports[0]?.id ?? null,
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<ReportAction | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (!query) return true;
      return (
        report.reporter.name.toLowerCase().includes(query) ||
        (report.targetLabel ?? "").toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query)
      );
    });
  }, [reports, statusFilter, search]);

  const selected = reports.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  async function handleAction(action: ReportAction) {
    if (!selected) return;
    setIsSubmitting(action);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selected.id, action, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setReports((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, status: "reviewed", action, handledAt: new Date().toISOString() } : r)),
      );
      showToast("Đã xử lý báo cáo.", "success");
      setNote("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-subheading font-semibold text-text-primary tracking-tight">
          Xử lý báo cáo vi phạm
        </h1>
        <p className="text-sm text-text-secondary">
          {reports.filter((r) => r.status === "pending").length} báo cáo đang chờ xử lý trên tổng {reports.length}
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={Flag} title="Chưa có báo cáo nào" description="Báo cáo vi phạm từ người dùng sẽ hiện tại đây." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo người báo cáo, lý do..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-10 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
              >
                <option value="pending">Chờ xử lý</option>
                <option value="reviewed">Đã xử lý</option>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">Không có báo cáo phù hợp.</p>
              ) : (
                filtered.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-xl text-left transition-colors border",
                      selected?.id === report.id ? "bg-soft-blue border-primary-blue/40" : "border-border hover:bg-cream",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="neutral">{REPORT_TARGET_LABELS[report.targetType]}</Badge>
                      <Badge variant={report.status === "pending" ? "warning" : "success"}>
                        {report.status === "pending" ? "Chờ xử lý" : "Đã xử lý"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-text-primary truncate">{report.targetLabel ?? "Nội dung đã bị xoá"}</p>
                    <p className="text-xs text-text-secondary line-clamp-1">{report.reason}</p>
                    <p className="text-[11px] text-text-secondary">
                      Báo cáo bởi {report.reporter.name} · {formatRelativeTime(report.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>

          {selected ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-subheading font-semibold text-text-primary">{selected.targetLabel ?? "Nội dung đã bị xoá"}</h3>
                  <p className="text-sm text-text-secondary">{REPORT_TARGET_LABELS[selected.targetType]}</p>
                </div>
                <Badge variant={selected.status === "pending" ? "warning" : "success"}>
                  {selected.status === "pending" ? "Chờ xử lý" : "Đã xử lý"}
                </Badge>
              </div>

              <div className="rounded-xl bg-cream p-3 space-y-1">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Lý do báo cáo</p>
                <p className="text-sm text-text-primary">{selected.reason}</p>
                <p className="text-xs text-text-secondary">
                  Bởi {selected.reporter.name} · {formatDateTime(selected.createdAt)}
                </p>
              </div>

              {selected.status === "reviewed" && (
                <p className="text-xs text-text-secondary">
                  Đã xử lý bởi {selected.handledBy?.name ?? "—"}
                  {selected.handledAt ? ` lúc ${formatDateTime(selected.handledAt)}` : ""}
                </p>
              )}

              {selected.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú quyết định (tuỳ chọn)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40 resize-none"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ACTION_OPTIONS.map(({ action, label, icon: Icon }) => (
                      <Button
                        key={action}
                        size="sm"
                        variant={action === "ban_user" ? "primary" : "outline"}
                        leftIcon={<Icon className="size-4" />}
                        isLoading={isSubmitting === action}
                        onClick={() => handleAction(action)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <EmptyState icon={Flag} title="Chọn một báo cáo để xem chi tiết" description="Danh sách bên trái." />
          )}
        </div>
      )}
    </div>
  );
}

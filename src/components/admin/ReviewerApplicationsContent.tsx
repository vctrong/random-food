"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge as BadgeIcon, CheckCircle2, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatDateTime, formatRelativeTime, isAllowedImageHost } from "@/lib/utils";
import type { AdminReviewerApplicationRow } from "@/types/admin";

interface ReviewerApplicationsContentProps {
  initialApplications: AdminReviewerApplicationRow[];
}

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "pink",
} as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
};

export function ReviewerApplicationsContent({ initialApplications }: ReviewerApplicationsContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [applications, setApplications] = useState(initialApplications);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialApplications.find((a) => a.status === "pending")?.id ?? initialApplications[0]?.id ?? null,
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approved" | "rejected" | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (!query) return true;
      return app.applicant.name.toLowerCase().includes(query) || app.applicant.email.toLowerCase().includes(query);
    });
  }, [applications, statusFilter, search]);

  const selected = applications.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  async function handleDecision(decision: "approved" | "rejected") {
    if (!selected) return;
    if (decision === "rejected" && !reason.trim()) {
      showToast("Cần nhập lý do khi từ chối đơn.", "warning");
      return;
    }
    setIsSubmitting(decision);
    try {
      const res = await fetch("/api/admin/reviewer-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: selected.id, decision, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === selected.id ? { ...a, status: decision, reason, reviewedAt: new Date().toISOString() } : a)),
      );
      showToast(decision === "approved" ? "Đã duyệt đơn ứng tuyển." : "Đã từ chối đơn ứng tuyển.", "success");
      setReason("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Đơn ứng tuyển FoodReviewer
        </h1>
        <p className="text-sm text-text-secondary">
          {applications.filter((a) => a.status === "pending").length} đơn đang chờ duyệt trên tổng {applications.length}
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={BadgeIcon}
          title="Chưa có đơn ứng tuyển nào"
          description="Khi có tính năng nộp đơn ứng tuyển FoodReviewer ở phía người dùng, đơn sẽ hiện tại đây để Admin duyệt."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên/email..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-10 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">Không có đơn phù hợp.</p>
              ) : (
                filtered.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl text-left transition-colors border",
                      selected?.id === app.id ? "bg-soft-blue border-primary-blue/40" : "border-border hover:bg-cream",
                    )}
                  >
                    {isAllowedImageHost(app.applicant.avatarUrl) ? (
                      <Image src={app.applicant.avatarUrl as string} alt={app.applicant.name} width={36} height={36} className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="size-9 rounded-full bg-white text-primary-blue font-semibold flex items-center justify-center text-sm shrink-0">
                        {app.applicant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{app.applicant.name}</p>
                      <p className="text-xs text-text-secondary truncate">{app.applicant.email}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[app.status]}>{STATUS_LABEL[app.status]}</Badge>
                  </button>
                ))
              )}
            </div>
          </Card>

          {selected ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">{selected.applicant.name}</h3>
                  <p className="text-sm text-text-secondary">{selected.applicant.email}</p>
                </div>
                <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Nộp đơn {formatRelativeTime(selected.createdAt)} ({formatDateTime(selected.createdAt)})
              </p>
              {selected.reviewedAt && (
                <p className="text-xs text-text-secondary">
                  Đã xử lý {formatDateTime(selected.reviewedAt)}
                  {selected.reason ? ` — Lý do: ${selected.reason}` : ""}
                </p>
              )}

              {selected.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ghi chú/lý do (bắt buộc khi từ chối)..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      leftIcon={<CheckCircle2 className="size-4" />}
                      isLoading={isSubmitting === "approved"}
                      onClick={() => handleDecision("approved")}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<XCircle className="size-4" />}
                      isLoading={isSubmitting === "rejected"}
                      onClick={() => handleDecision("rejected")}
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <EmptyState icon={BadgeIcon} title="Chọn một đơn để xem chi tiết" description="Danh sách bên trái." />
          )}
        </div>
      )}
    </div>
  );
}

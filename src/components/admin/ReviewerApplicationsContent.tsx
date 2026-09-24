"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge as BadgeIcon, CheckCircle2, ExternalLink, MapPin, Search, XCircle } from "lucide-react";
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

type StatusFilter = "pending" | "approved" | "rejected" | "withdrawn" | "all";

const STATUS_VARIANT = {
  pending: "warning",
  approved: "success",
  rejected: "pink",
  withdrawn: "neutral",
} as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã từ chối",
  withdrawn: "Đã rút đơn",
};

const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram / Threads" };

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
        prev.map((a) => (a.id === selected.id ? { ...a, status: decision, reviewNote: reason.trim() || null, reviewedAt: new Date().toISOString() } : a)),
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
          description="Khi người dùng nộp đơn ứng tuyển FoodReviewer, đơn sẽ hiện tại đây để Admin duyệt."
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
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-10 px-3 rounded-xl bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="withdrawn">Đã rút đơn</option>
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
                      selected?.id === app.id ? "bg-primary-soft border-primary/40" : "border-border hover:bg-background",
                    )}
                  >
                    {isAllowedImageHost(app.applicant.avatarUrl) ? (
                      <Image src={app.applicant.avatarUrl as string} alt={app.applicant.name} width={36} height={36} className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="size-9 rounded-full bg-surface text-primary font-semibold flex items-center justify-center text-sm shrink-0">
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
                  {selected.reviewNote ? ` — Ghi chú: ${selected.reviewNote}` : ""}
                </p>
              )}

              <ApplicationProfile profile={selected.profile} />

              {selected.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ghi chú/lý do (bắt buộc khi từ chối)..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
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

function ProfileBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{title}</span>
      <div className="text-sm text-text-primary leading-relaxed">{children}</div>
    </div>
  );
}

/** Hồ sơ ứng viên khai trong form — đơn cũ (trước khi có form) không có nên hiện thông báo thay thế. */
function ApplicationProfile({ profile }: { profile: AdminReviewerApplicationRow["profile"] }) {
  if (!profile) {
    return (
      <p className="text-sm text-text-secondary p-3 rounded-xl bg-background">
        Đơn này được tạo trước khi có form ứng tuyển nên không có hồ sơ chi tiết.
      </p>
    );
  }

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      <ProfileBlock title="Họ tên thật">{profile.fullName || "—"}</ProfileBlock>
      <ProfileBlock title="Lý do ứng tuyển">
        <p className="whitespace-pre-line">{profile.motivation || "—"}</p>
      </ProfileBlock>
      <ProfileBlock title="Khẩu vị sở trường">
        <div className="flex flex-wrap gap-1.5">
          {profile.expertise.map((name) => (
            <Badge key={name} variant="pink">
              {name}
            </Badge>
          ))}
        </div>
      </ProfileBlock>
      <ProfileBlock title="Khu vực xác minh thực địa">
        <div className="flex flex-wrap gap-1.5">
          {profile.activeAreas.map((area) => (
            <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium">
              <MapPin className="size-3" aria-hidden />
              {area}
            </span>
          ))}
        </div>
      </ProfileBlock>
      {profile.socialLinks.length > 0 && (
        <ProfileBlock title="Kênh review">
          <ul className="space-y-1">
            {profile.socialLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {PLATFORM_LABEL[link.platform] ?? link.platform}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </ProfileBlock>
      )}
      <ProfileBlock title={`Ảnh tiêu biểu (${profile.portfolioImages.length})`}>
        <div className="flex flex-wrap gap-2">
          {profile.portfolioImages.map((url) =>
            isAllowedImageHost(url) ? (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative size-20 rounded-xl overflow-hidden border border-border">
                <Image src={url} alt="Ảnh tiêu biểu của ứng viên" fill sizes="80px" className="object-cover" />
              </a>
            ) : null,
          )}
        </div>
      </ProfileBlock>
      <ProfileBlock title="Bài trả lời tình huống">
        <p className="whitespace-pre-line p-3 rounded-xl bg-background">{profile.scenarioAnswer || "—"}</p>
      </ProfileBlock>
      {profile.agreedAt && (
        <p className="text-xs text-text-secondary">Đã đồng ý cam kết đạo đức lúc {formatDateTime(profile.agreedAt)}.</p>
      )}
    </div>
  );
}

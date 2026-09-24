"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Search, UtensilsCrossed, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { MODERATION_STATUS_LABELS } from "@/constants/admin";
import { cn, formatPriceRange, isAllowedImageHost } from "@/lib/utils";
import type { AdminContentRow, ModerationStatus } from "@/types/admin";

interface ContentModerationContentProps {
  initialRows: AdminContentRow[];
}

type StatusFilter = "all" | ModerationStatus;

const STATUS_VARIANT: Record<ModerationStatus, "warning" | "success" | "pink" | "blue"> = {
  pending: "warning",
  approved: "success",
  rejected: "pink",
  needs_revision: "blue",
};

export function ContentModerationContent({ initialRows }: ContentModerationContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.moderationStatus !== statusFilter) return false;
      if (!query) return true;
      return row.name.toLowerCase().includes(query) || row.submitter.name.toLowerCase().includes(query);
    });
  }, [rows, statusFilter, search]);

  const key = (row: AdminContentRow) => `${row.targetType}:${row.id}`;
  const selected = rows.find((r) => key(r) === selectedKey) ?? filtered[0] ?? null;
  const selectedKeyValue = selected ? key(selected) : null;

  async function handleDecision(decision: "approved" | "rejected" | "needs_revision") {
    if (!selected) return;
    if (decision !== "approved" && !note.trim()) {
      showToast("Cần nhập ghi chú/lý do trước khi gửi quyết định này.", "warning");
      return;
    }
    setIsSubmitting(decision);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: selected.targetType, targetId: selected.id, decision, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          key(row) === key(selected) ? { ...row, moderationStatus: decision, moderationNote: note || null } : row,
        ),
      );
      showToast("Đã cập nhật trạng thái kiểm duyệt.", "success");
      setNote("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  async function handleVisibility(row: AdminContentRow, visibility: "visible" | "hidden") {
    const res = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: row.targetType, targetId: row.id, visibility }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Có lỗi xảy ra.", "error");
      return;
    }
    setRows((prev) => prev.map((r) => (key(r) === key(row) ? { ...r, visibility } : r)));
    showToast(visibility === "hidden" ? "Đã ẩn nội dung." : "Đã hiện lại nội dung.", "success");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Quản lý nội dung ẩm thực
        </h1>
        <p className="text-sm text-text-secondary">{rows.length} món ăn &amp; quán ăn trong hệ thống</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Chưa có nội dung nào" description="Món ăn/quán ăn do người dùng đóng góp sẽ hiện tại đây." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên..."
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
                <option value="rejected">Từ chối</option>
                <option value="needs_revision">Cần sửa</option>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">Không có nội dung phù hợp.</p>
              ) : (
                filtered.map((row) => (
                  <button
                    key={key(row)}
                    type="button"
                    onClick={() => setSelectedKey(key(row))}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl text-left transition-colors border",
                      selectedKeyValue === key(row) ? "bg-primary-soft border-primary/40" : "border-border hover:bg-background",
                    )}
                  >
                    {isAllowedImageHost(row.images[0]) ? (
                      <Image src={row.images[0]} alt={row.name} width={44} height={44} className="size-11 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="size-11 rounded-lg bg-primary-soft flex items-center justify-center text-primary shrink-0">
                        <UtensilsCrossed className="size-5" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{row.name}</p>
                      <p className="text-xs text-text-secondary truncate">bởi {row.submitter.name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[row.moderationStatus]}>{MODERATION_STATUS_LABELS[row.moderationStatus]}</Badge>
                  </button>
                ))
              )}
            </div>
          </Card>

          {selected ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">{selected.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {selected.targetType === "food" ? "Món ăn" : "Quán ăn"} · bởi {selected.submitter.name}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[selected.moderationStatus]}>{MODERATION_STATUS_LABELS[selected.moderationStatus]}</Badge>
              </div>

              {selected.description && <p className="text-sm text-text-primary">{selected.description}</p>}
              {selected.address && <p className="text-sm text-text-secondary">📍 {selected.address}</p>}
              {selected.priceMin != null && selected.priceMax != null && (
                <p className="text-sm font-semibold text-primary">{formatPriceRange(selected.priceMin, selected.priceMax)}</p>
              )}
              {selected.moderationNote && (
                <p className="text-sm text-text-secondary bg-background rounded-xl px-3 py-2">Ghi chú: {selected.moderationNote}</p>
              )}

              {selected.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selected.images.filter(isAllowedImageHost).map((src) => (
                    <Image key={src} src={src} alt={selected.name} width={96} height={96} className="size-24 rounded-xl object-cover shrink-0" />
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú/lý do (bắt buộc khi từ chối hoặc yêu cầu sửa)..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" leftIcon={<CheckCircle2 className="size-4" />} isLoading={isSubmitting === "approved"} onClick={() => handleDecision("approved")}>
                    Duyệt
                  </Button>
                  <Button size="sm" variant="outline" isLoading={isSubmitting === "needs_revision"} onClick={() => handleDecision("needs_revision")}>
                    Yêu cầu sửa
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<XCircle className="size-4" />} isLoading={isSubmitting === "rejected"} onClick={() => handleDecision("rejected")}>
                    Từ chối
                  </Button>
                  {selected.moderationStatus === "approved" && (
                    selected.visibility === "visible" ? (
                      <Button size="sm" variant="outline" leftIcon={<EyeOff className="size-4" />} onClick={() => handleVisibility(selected, "hidden")}>
                        Ẩn khỏi trang chủ
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" leftIcon={<Eye className="size-4" />} onClick={() => handleVisibility(selected, "visible")}>
                        Hiện lại
                      </Button>
                    )
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState icon={UtensilsCrossed} title="Chọn một mục để xem chi tiết" description="Danh sách bên trái." />
          )}
        </div>
      )}
    </div>
  );
}

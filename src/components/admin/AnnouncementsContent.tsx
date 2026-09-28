"use client";

import { useMemo, useState } from "react";
import { Eye, Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import { useToast } from "@/components/ui/ToastProvider";
import { AnnouncementTypeBadge } from "@/components/announcements/AnnouncementBadges";
import {
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_TARGET_LABELS,
  type AnnouncementDisplayStatus,
} from "@/constants/announcements";
import {
  deleteAnnouncement,
  getAdminAnnouncement,
  listAdminAnnouncements,
} from "@/services/announcementService";
import { cn, formatDateTime } from "@/lib/utils";
import type { AdminAnnouncementDetail, AdminAnnouncementRow } from "@/types/announcement";
import { AnnouncementEditor } from "./AnnouncementEditor";

type StatusFilter = "all" | AnnouncementDisplayStatus;

const STATUS_VARIANT: Record<AnnouncementDisplayStatus, "neutral" | "warning" | "success" | "pink"> = {
  draft: "neutral",
  scheduled: "warning",
  live: "success",
  expired: "pink",
};

const FILTERS: StatusFilter[] = ["all", "live", "scheduled", "draft", "expired"];

function timeLine(row: AdminAnnouncementRow): string {
  if (row.displayStatus === "draft") return `Sửa lần cuối ${formatDateTime(row.updatedAt)}`;
  if (row.displayStatus === "scheduled" && row.publishAt) return `Sẽ đăng lúc ${formatDateTime(row.publishAt)}`;
  const published = row.publishAt ? `Đăng ${formatDateTime(row.publishAt)}` : "";
  const expire = row.expireAt ? ` · ${row.displayStatus === "expired" ? "Đã hết hạn" : "Hết hạn"} ${formatDateTime(row.expireAt)}` : "";
  return published + expire;
}

/** Trang quản lý thông báo chính thức (docs/notifications.md mục 6) — danh sách ⇄ trình soạn. */
export function AnnouncementsContent({ initialRows }: { initialRows: AdminAnnouncementRow[] }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<AdminAnnouncementDetail | "new" | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminAnnouncementRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: rows.length, draft: 0, scheduled: 0, live: 0, expired: 0 };
    for (const row of rows) result[row.displayStatus] += 1;
    return result;
  }, [rows]);
  const visible = filter === "all" ? rows : rows.filter((row) => row.displayStatus === filter);

  async function reload() {
    const result = await listAdminAnnouncements();
    if (result.ok) setRows(result.data);
  }

  async function openEditor(row: AdminAnnouncementRow) {
    setLoadingId(row.id);
    const result = await getAdminAnnouncement(row.id);
    setLoadingId(null);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    setEditing(result.data);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const result = await deleteAnnouncement(deleting.id);
    setIsDeleting(false);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== deleting.id));
    setDeleting(null);
    showToast("Đã gỡ thông báo", "success");
  }

  if (editing) {
    return (
      <AnnouncementEditor
        key={editing === "new" ? "new" : editing.id}
        existing={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          void reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">Thông báo chính thức</h1>
          <p className="text-sm text-text-secondary">Đăng tin, bảo trì, cập nhật tính năng lên mục Tin tức — theo đối tượng và lịch hiển thị.</p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          Tạo thông báo
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
              filter === value
                ? "border-primary-strong bg-primary-strong text-white"
                : "border-border bg-surface text-text-secondary hover:text-text-primary",
            )}
          >
            {value === "all" ? "Tất cả" : ANNOUNCEMENT_STATUS_LABELS[value]}
            <span className={cn("text-xs tabular-nums", filter === value ? "text-white/80" : "text-text-secondary")}>{counts[value]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={rows.length === 0 ? "Chưa có thông báo nào" : "Không có thông báo ở trạng thái này"}
          description={rows.length === 0 ? "Tạo thông báo đầu tiên để gửi tới người dùng qua mục Tin tức." : "Chọn bộ lọc khác để xem."}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Thông báo</th>
                  <th className="px-4 py-3 font-semibold">Đối tượng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-right">Lượt xem</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3 min-w-[260px]">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <AnnouncementTypeBadge type={row.type} />
                        {row.isPinned && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-strong dark:text-text-primary">
                            <Pin className="size-3.5" aria-hidden /> Ghim
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-text-primary">{row.title}</p>
                      <p className="text-xs text-text-secondary">/tin-tuc/{row.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {row.targetRoles.map((role) => ANNOUNCEMENT_TARGET_LABELS[role]).join(", ")}
                    </td>
                    <td className="px-4 py-3 min-w-[190px]">
                      <Badge variant={STATUS_VARIANT[row.displayStatus]}>{ANNOUNCEMENT_STATUS_LABELS[row.displayStatus]}</Badge>
                      <p className="mt-1 text-xs text-text-secondary">{timeLine(row)}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums">{row.viewCount.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <a
                          href={`/tin-tuc/${row.slug}?preview=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Xem trước: ${row.title}`}
                          title="Xem trước"
                          className="grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-primary-soft hover:text-text-primary"
                        >
                          <Eye className="size-4" aria-hidden />
                        </a>
                        <Button size="sm" variant="outline" isLoading={loadingId === row.id} leftIcon={<Pencil className="size-3.5" />} onClick={() => openEditor(row)}>
                          Sửa
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleting(row)}
                          aria-label={`Gỡ: ${row.title}`}
                          title="Gỡ thông báo"
                          className="grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-accent-soft hover:text-accent-ink"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDangerModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Gỡ thông báo này?"
        description={`“${deleting?.title ?? ""}” sẽ biến mất khỏi Tin tức, banner và chuông của mọi người. Không hoàn tác được — muốn tạm ẩn thì chuyển về nháp.`}
        confirmLabel="Gỡ thông báo"
      />
    </div>
  );
}

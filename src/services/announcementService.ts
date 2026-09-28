import { callJson, type ApiResult } from "@/services/apiClient";
import type {
  AdminAnnouncementDetail,
  AdminAnnouncementRow,
  AnnouncementInput,
  AnnouncementSummary,
} from "@/types/announcement";

/** Lớp duy nhất phía client gọi API thông báo chính thức (docs/notifications.md mục 7). */

export function getUnseenAnnouncements(): Promise<ApiResult<AnnouncementSummary[]>> {
  return callJson<AnnouncementSummary[]>("/api/announcements?unseen=1", { method: "GET" });
}

/** Chỉ bài `id` là đã đọc. */
export function markAnnouncementRead(id: string): Promise<ApiResult<{ ok: true }>> {
  return callJson<{ ok: true }>("/api/announcements/seen", { method: "POST", body: JSON.stringify({ id }) });
}

/** "Đánh dấu đã đọc hết". */
export function markAllAnnouncementsRead(): Promise<ApiResult<{ ok: true }>> {
  return callJson<{ ok: true }>("/api/announcements/seen", { method: "POST", body: JSON.stringify({}) });
}

export function getBannerAnnouncement(): Promise<ApiResult<AnnouncementSummary | null>> {
  return callJson<AnnouncementSummary | null>("/api/announcements/banner", { method: "GET" });
}

export function recordAnnouncementView(slug: string): Promise<ApiResult<{ ok: boolean }>> {
  return callJson<{ ok: boolean }>(`/api/announcements/${encodeURIComponent(slug)}/view`, { method: "POST" });
}

export function listAdminAnnouncements(): Promise<ApiResult<AdminAnnouncementRow[]>> {
  return callJson<AdminAnnouncementRow[]>("/api/admin/announcements", { method: "GET" });
}

export function getAdminAnnouncement(id: string): Promise<ApiResult<AdminAnnouncementDetail>> {
  return callJson<AdminAnnouncementDetail>(`/api/admin/announcements/${id}`, { method: "GET" });
}

export function createAnnouncement(input: AnnouncementInput): Promise<ApiResult<{ ok: true; id: string; slug: string }>> {
  return callJson<{ ok: true; id: string; slug: string }>("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAnnouncement(id: string, input: AnnouncementInput): Promise<ApiResult<{ ok: true; slug: string }>> {
  return callJson<{ ok: true; slug: string }>(`/api/admin/announcements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAnnouncement(id: string): Promise<ApiResult<{ ok: true }>> {
  return callJson<{ ok: true }>(`/api/admin/announcements/${id}`, { method: "DELETE" });
}

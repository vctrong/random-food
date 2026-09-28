import { callJson, type ApiResult } from "@/services/apiClient";
import type {
  NotificationListResponse,
  NotificationPreferences,
  UnreadCountResponse,
} from "@/types/notification";

/** Lớp duy nhất phía client gọi API thông báo (docs/notifications.md mục 7). */

export function getNotifications(options: { cursor?: string | null; limit?: number; unreadOnly?: boolean } = {}): Promise<ApiResult<NotificationListResponse>> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.unreadOnly) params.set("unread", "1");
  return callJson<NotificationListResponse>(`/api/notifications?${params.toString()}`, { method: "GET" });
}

export function getUnreadCount(): Promise<ApiResult<UnreadCountResponse>> {
  return callJson<UnreadCountResponse>("/api/notifications/unread-count", { method: "GET" });
}

export function markNotificationsRead(target: { ids: string[] } | { all: true }): Promise<ApiResult<{ ok: true }>> {
  return callJson<{ ok: true }>("/api/notifications", { method: "PATCH", body: JSON.stringify(target) });
}

export function deleteNotifications(ids: string[]): Promise<ApiResult<{ ok: true; deleted: number }>> {
  return callJson<{ ok: true; deleted: number }>("/api/notifications", { method: "DELETE", body: JSON.stringify({ ids }) });
}

export function updateEmailPreferences(email: Record<string, boolean>): Promise<ApiResult<NotificationPreferences>> {
  return callJson<NotificationPreferences>("/api/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

import type { AnnouncementDisplayStatus, AnnouncementTargetRole } from "@/constants/announcements";

/**
 * Hàm thuần: trạng thái hiển thị tính từ status + publishAt + expireAt tại thời
 * điểm `now` — DB chỉ lưu draft/published nên không cần cron (docs/notifications.md 2.2).
 */
export function getAnnouncementDisplayStatus(
  announcement: { status: "draft" | "published"; publishAt?: Date | null; expireAt?: Date | null },
  now: Date = new Date(),
): AnnouncementDisplayStatus {
  if (announcement.status === "draft" || !announcement.publishAt) return "draft";
  if (announcement.publishAt.getTime() > now.getTime()) return "scheduled";
  if (announcement.expireAt && announcement.expireAt.getTime() <= now.getTime()) return "expired";
  return "live";
}

/** Guest (role null) chỉ thấy bài nhắm "all". */
export function canRoleSeeAnnouncement(targetRoles: readonly string[], role: string | null): boolean {
  if (targetRoles.includes("all")) return true;
  return role !== null && targetRoles.includes(role as AnnouncementTargetRole);
}

/** Điều kiện Mongo tương đương "live" + hợp role — dùng chung mọi truy vấn phía user. */
export function liveAnnouncementFilter(role: string | null, now: Date = new Date()): Record<string, unknown> {
  return {
    status: "published",
    publishAt: { $lte: now },
    $or: [{ expireAt: null }, { expireAt: { $gt: now } }],
    targetRoles: { $in: role ? ["all", role] : ["all"] },
  };
}

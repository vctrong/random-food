import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";
import type { NotificationItem, NotificationListResponse, NotificationType } from "@/types/notification";

interface NotificationLean {
  _id: Types.ObjectId;
  type: NotificationType;
  payload?: Record<string, unknown>;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

function toItem(doc: NotificationLean): NotificationItem {
  return {
    id: String(doc._id),
    type: doc.type,
    payload: doc.payload ?? {},
    link: doc.link ?? null,
    isRead: doc.isRead,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listNotifications(
  recipientId: string,
  { cursor, limit, unreadOnly }: { cursor?: string; limit: number; unreadOnly: boolean },
): Promise<NotificationListResponse> {
  await connectDB();
  const filter: Record<string, unknown> = { recipientId };
  if (unreadOnly) filter.isRead = false;
  if (cursor && Types.ObjectId.isValid(cursor)) filter._id = { $lt: new Types.ObjectId(cursor) };

  // Lấy dư 1 bản ghi để biết còn trang sau không.
  const docs = (await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("type payload link isRead createdAt")
    .lean()) as unknown as NotificationLean[];

  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map(toItem);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function countUnreadNotifications(recipientId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ recipientId, isRead: false });
}

/** Chỉ tác động lên thông báo của chính recipientId. */
export async function markNotificationsRead(recipientId: string, target: { ids: string[] } | { all: true }): Promise<void> {
  await connectDB();
  const filter: Record<string, unknown> = { recipientId, isRead: false };
  if ("ids" in target) filter._id = { $in: target.ids };
  await Notification.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
}

export async function deleteNotifications(recipientId: string, ids: string[]): Promise<number> {
  await connectDB();
  const result = await Notification.deleteMany({ recipientId, _id: { $in: ids } });
  return result.deletedCount ?? 0;
}

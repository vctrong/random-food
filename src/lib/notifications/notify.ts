import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Log } from "@/lib/models/Log";
import { Notification } from "@/lib/models/Notification";
import { User } from "@/lib/models/User";
import { isOptionalEmailType } from "@/constants/notifications";
import { publish, userChannel } from "@/lib/realtime/realtimeService";
import type { NotificationPayload, NotificationType } from "@/types/notification";
import { buildNotificationLink } from "./links";
import { getNotificationPreferences } from "./preferences";
import { sendPush } from "./pushService";
import { shouldSendEmail } from "./emailPolicy";
import { scheduleNotificationEmail } from "./email";

export interface NotifyInput<T extends NotificationType> {
  type: T;
  payload: NotificationPayload<T>;
  /** Reviewer/Admin gây ra sự kiện — không bao giờ trả ra client. */
  actorId?: string;
  /** false = không gửi email cho lần gọi này dù loại có email. */
  email?: boolean;
}

async function logFailure(step: string, type: NotificationType, error: unknown) {
  console.error(`[notify] ${step} failed (${type}):`, error);
  try {
    await Log.create({ action: "notification_failed", metadata: { step, type, message: String(error) } });
  } catch {
    // Ghi log hỏng thì thôi — không được làm hỏng nghiệp vụ chính.
  }
}

async function deliverEmail(recipientId: string, type: NotificationType, payload: Record<string, unknown>, link: string | null) {
  const emailPrefs = isOptionalEmailType(type) ? (await getNotificationPreferences(recipientId)).email : {};
  if (!shouldSendEmail(type, payload, emailPrefs)) return;
  await scheduleNotificationEmail(recipientId, type, payload, link, (error) => logFailure("email", type, error));
}

async function deliver(
  recipientId: string,
  notificationId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
  link: string | null,
  email: boolean,
) {
  const results = await Promise.allSettled([
    publish(userChannel(recipientId), "notification:new", { id: notificationId, type }),
    sendPush(recipientId, type, notificationId),
    email ? deliverEmail(recipientId, type, payload, link) : Promise.resolve(),
  ]);
  const steps = ["realtime", "push", "email"];
  await Promise.all(
    results.map((result, index) => (result.status === "rejected" ? logFailure(steps[index], type, result.reason) : undefined)),
  );
}

/**
 * Service DUY NHẤT tạo thông báo (docs/notifications.md mục 3). Không bao giờ ném
 * lỗi — gọi sau khi nghiệp vụ đã ghi DB, lỗi thông báo chỉ được ghi log.
 */
export async function notify<T extends NotificationType>(recipientId: string, input: NotifyInput<T>): Promise<void> {
  await notifyMany([recipientId], input);
}

export async function notifyMany<T extends NotificationType>(recipientIds: string[], input: NotifyInput<T>): Promise<void> {
  const { type, payload, actorId, email = true } = input;
  const recipients = [...new Set(recipientIds.map(String))].filter(
    (id) => Types.ObjectId.isValid(id) && id !== actorId,
  );
  if (recipients.length === 0) return;

  const link = buildNotificationLink(type, payload);
  let created: { _id: unknown; recipientId: unknown }[];
  try {
    await connectDB();
    created = await Notification.insertMany(
      recipients.map((recipientId) => ({
        recipientId,
        type,
        payload,
        link: link ?? undefined,
        ...(actorId && Types.ObjectId.isValid(actorId) && { actorId }),
      })),
    );
  } catch (error) {
    await logFailure("save", type, error);
    return;
  }

  await Promise.all(
    created.map((doc) =>
      deliver(String(doc.recipientId), String(doc._id), type, payload as Record<string, unknown>, link, email).catch((error) =>
        logFailure("deliver", type, error),
      ),
    ),
  );
}

/** Gửi cho mọi Admin đang hoạt động (vd case báo cáo mới). */
export async function notifyAdmins<T extends NotificationType>(input: NotifyInput<T>): Promise<void> {
  try {
    await connectDB();
    const admins = (await User.find({ role: "admin", accountStatus: { $ne: "banned" } }).select("_id").lean()) as { _id: unknown }[];
    await notifyMany(
      admins.map((admin) => String(admin._id)),
      input,
    );
  } catch (error) {
    await logFailure("admins", input.type, error);
  }
}

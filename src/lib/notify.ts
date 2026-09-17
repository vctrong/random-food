import { connectDB } from "@/lib/mongodb";
import { Notification, type NotificationType } from "@/lib/models/Notification";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  relatedId?: string;
}

export async function createNotification({
  userId,
  type,
  message,
  relatedId,
}: CreateNotificationInput) {
  await connectDB();
  await Notification.create({ userId, type, message, relatedId });
}

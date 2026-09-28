import type { NotificationType } from "@/types/notification";

/** Interface để sẵn cho push web/mobile (collection deviceTokens) — chưa triển khai. */
export async function sendPush(recipientId: string, type: NotificationType, notificationId: string): Promise<void> {
  void recipientId;
  void type;
  void notificationId;
}

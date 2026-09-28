import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { sendEmail } from "@/lib/email/emailService";
import { buildNotificationEmail } from "@/lib/email/templates";
import { isOptionalEmailType, type NotificationType } from "@/constants/notifications";

function appUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

async function sendNotificationEmail(recipientId: string, type: NotificationType, payload: Record<string, unknown>, link: string | null) {
  await connectDB();
  const user = (await User.findById(recipientId).select("email name").lean()) as { email?: string; name?: string } | null;
  if (!user?.email) return;
  const base = appUrl();
  await sendEmail(
    buildNotificationEmail({
      to: user.email,
      name: user.name?.trim() || "bạn",
      type,
      payload,
      actionUrl: type === "account_unbanned" ? `${base}/dang-nhap` : link ? `${base}${link}` : null,
      settingsUrl: isOptionalEmailType(type) ? `${base}/cai-dat#thong-bao` : null,
    }),
  );
}

/**
 * Gửi sau khi response đã trả (after()) để thao tác Admin/Reviewer không phải chờ
 * SMTP. Ngoài phạm vi request (after() ném lỗi) thì gửi luôn. Lỗi → onError, không ném ra ngoài.
 */
export function scheduleNotificationEmail(
  recipientId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
  link: string | null,
  onError: (error: unknown) => Promise<void>,
): Promise<void> {
  const task = () => sendNotificationEmail(recipientId, type, payload, link).catch(onError);
  try {
    after(task);
    return Promise.resolve();
  } catch {
    return task();
  }
}

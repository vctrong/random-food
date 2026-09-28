import { connectDB } from "@/lib/mongodb";
import { UserProfile } from "@/lib/models/UserProfile";
import { OPTIONAL_EMAIL_DEFAULTS, isOptionalEmailType } from "@/constants/notifications";
import type { NotificationPreferences } from "@/types/notification";

interface ProfilePrefsLean {
  notificationPreferences?: { email?: Record<string, boolean | undefined> };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  await connectDB();
  const profile = (await UserProfile.findOne({ userId }).select("notificationPreferences").lean()) as ProfilePrefsLean | null;
  const stored = profile?.notificationPreferences?.email ?? {};
  const email: Record<string, boolean> = {};
  for (const [type, fallback] of Object.entries(OPTIONAL_EMAIL_DEFAULTS)) {
    email[type] = typeof stored[type] === "boolean" ? (stored[type] as boolean) : fallback;
  }
  return { email };
}

/** Chỉ ghi key thuộc loại email tuỳ chọn — loại bắt buộc bị bỏ qua dù client có gửi. */
export async function updateEmailPreferences(userId: string, email: Record<string, boolean>): Promise<NotificationPreferences> {
  const setFields: Record<string, unknown> = {};
  for (const [type, value] of Object.entries(email)) {
    if (isOptionalEmailType(type)) setFields[`notificationPreferences.email.${type}`] = value;
  }
  await connectDB();
  if (Object.keys(setFields).length > 0) {
    await UserProfile.updateOne({ userId }, { $set: { ...setFields, updatedAt: new Date() } }, { upsert: true });
  }
  return getNotificationPreferences(userId);
}

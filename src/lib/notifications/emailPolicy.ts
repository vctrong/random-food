import { isMandatoryEmail, isOptionalEmailType, type NotificationType } from "@/constants/notifications";

/** Hàm thuần: loại này có gửi email không (docs/notifications.md mục 5). */
export function shouldSendEmail(
  type: NotificationType,
  payload: Record<string, unknown>,
  emailPrefs: Record<string, boolean>,
): boolean {
  if (isMandatoryEmail(type, payload)) return true;
  if (isOptionalEmailType(type)) return emailPrefs[type] === true;
  return false;
}

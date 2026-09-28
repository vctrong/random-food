import type { NotificationPayload, NotificationType } from "@/types/notification";

/** Đường dẫn khi bấm vào thông báo — lưu cùng bản ghi lúc tạo. null = thông báo chỉ để đọc. */
export function buildNotificationLink(type: NotificationType, payload: NotificationPayload): string | null {
  const data = payload as Record<string, unknown>;
  const isFood = data.targetType === "food";
  const targetId = typeof data.targetId === "string" ? data.targetId : null;
  const editFoodId = isFood ? targetId : typeof data.foodId === "string" ? data.foodId : null;

  switch (type) {
    case "food_approved":
    case "content_corrected":
      return isFood && targetId ? `/mon-an/${targetId}` : "/dong-gop";
    case "food_needs_revision":
      return editFoodId ? `/dong-gop?edit=${editFoodId}` : "/dong-gop";
    case "food_rejected":
    case "category_proposal_approved":
    case "category_proposal_rejected":
    case "category_proposal_merged":
      return "/dong-gop";
    case "contribution_resubmitted":
      return "/reviewer";
    case "report_created":
      return "/admin/bao-cao";
    case "role_changed":
    case "password_changed":
    case "login_failed":
      return "/ho-so";
    case "reviewer_application_result":
      return data.decision === "approved" ? "/reviewer" : "/ung-tuyen-reviewer";
    default:
      return null;
  }
}

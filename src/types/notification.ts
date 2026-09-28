import type { NotificationType } from "@/constants/notifications";

export type { NotificationType };

type ContributionTarget = "food" | "restaurant";
type ReportTarget = "review" | "food" | "restaurant";
type Role = "user" | "foodreviewer" | "admin";

interface ContributionRef {
  targetType: ContributionTarget;
  targetId: string;
  name: string;
  /** Chỉ khi targetType = restaurant: món của chính user tại quán — form sửa đóng góp mở theo món. */
  foodId?: string;
}

/** Dữ liệu từng loại — không chứa câu chữ, frontend tự dựng nội dung (docs/notifications.md mục 1). */
export interface NotificationPayloadMap {
  food_approved: ContributionRef;
  food_rejected: ContributionRef & { reason: string };
  food_needs_revision: ContributionRef & { feedback: string };
  content_corrected: ContributionRef & { fields: string[] };
  contribution_resubmitted: ContributionRef;
  category_proposal_approved: { proposalName: string; categoryId: string; categoryName: string };
  category_proposal_rejected: { proposalName: string; reason?: string };
  category_proposal_merged: { proposalName: string; categoryId: string; categoryName: string };
  report_handled: {
    caseId: string;
    targetType: ReportTarget;
    outcome: "removed" | "updated" | "dismissed";
    /** Chỉ khi outcome = updated: sửa thông tin / đánh dấu quán đóng cửa / gộp quán trùng. */
    detail?: "edited" | "closed" | "merged";
  };
  report_created: { caseId: string; targetType: ReportTarget };
  content_removed: { targetType: ReportTarget; targetId: string; name: string; reason?: string; warningCount?: number };
  account_banned: { reason?: string };
  account_unbanned: Record<string, never>;
  role_changed: { previousRole: Role; newRole: Role };
  reviewer_application_result: { decision: "approved" | "rejected"; reason?: string };
  password_changed: { method: "change" | "set" | "link" | "reset" };
  login_failed: { reason: "wrong_password" | "banned" };
}

export type NotificationPayload<T extends NotificationType = NotificationType> = NotificationPayloadMap[T];

/** 1 thông báo trả về client — không có actorId (BR-M14: không lộ người báo cáo). */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  nextCursor: string | null;
}

export interface UnreadCountResponse {
  notifications: number;
  announcements: number;
  total: number;
  /** Badge hàng chờ — đếm thẳng từ DB, không phải thông báo. null với user thường. */
  pending: { reviewQueue: number; reportCases: number | null } | null;
}

export interface NotificationPreferences {
  email: Record<string, boolean>;
}

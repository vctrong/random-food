import { CORRECTED_FIELD_LABELS, type NotificationType } from "@/constants/notifications";
import { ROLE_LABELS } from "@/constants/admin";

/**
 * Hàm thuần: dựng câu chữ hiển thị từ type + payload (DB không lưu câu chữ —
 * docs/notifications.md mục 1). Không import React/icon: component tự map `icon`
 * sang lucide-react và `tone` sang token màu.
 */

export type NotificationTone = "primary" | "accent" | "secondary" | "success" | "warning";

export type NotificationIconKey =
  | "check"
  | "x"
  | "pencil"
  | "wrench"
  | "refresh"
  | "tag"
  | "flag"
  | "trash"
  | "lock"
  | "unlock"
  | "badge"
  | "key"
  | "alert";

export interface NotificationContent {
  title: string;
  body: string | null;
  tone: NotificationTone;
  icon: NotificationIconKey;
  /** Nhãn nút hành động trong thẻ (dẫn tới `link` của thông báo). */
  actionLabel: string | null;
}

type Payload = Record<string, unknown>;

function str(payload: Payload, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function quoted(name: string): string {
  return name ? `“${name}”` : "";
}

function targetLabel(payload: Payload, capitalized = true): string {
  const type = payload.targetType;
  const label = type === "restaurant" ? "quán" : type === "review" ? "đánh giá" : "món";
  return capitalized ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

function subject(payload: Payload): string {
  return [targetLabel(payload), quoted(str(payload, "name"))].filter(Boolean).join(" ");
}

function reasonLine(prefix: string, value: string): string | null {
  return value ? `${prefix}: ${value}` : null;
}

export function buildNotificationContent(type: NotificationType, payload: Payload): NotificationContent {
  switch (type) {
    case "food_approved":
      return {
        title: `${subject(payload)} đã được duyệt`,
        body: "Giờ ai cũng thấy được rồi, cảm ơn bạn đã đóng góp 💙",
        tone: "success",
        icon: "check",
        actionLabel: payload.targetType === "food" ? "Xem món" : "Xem đóng góp",
      };
    case "food_rejected":
      return {
        title: `${subject(payload)} chưa được duyệt`,
        body: reasonLine("Lý do", str(payload, "reason")),
        tone: "warning",
        icon: "x",
        actionLabel: "Xem đóng góp",
      };
    case "food_needs_revision":
      return {
        title: `${subject(payload)} cần bạn sửa thêm một chút`,
        body: reasonLine("Góp ý", str(payload, "feedback")),
        tone: "accent",
        icon: "pencil",
        actionLabel: "Sửa ngay",
      };
    case "content_corrected": {
      const fields = Array.isArray(payload.fields) ? payload.fields.map(String) : [];
      const labels = [...new Set(fields.map((field) => CORRECTED_FIELD_LABELS[field] ?? field))].join(", ");
      return {
        title: `Tụi mình đã chỉnh ${labels || "thông tin"} của ${targetLabel(payload, false)} ${quoted(str(payload, "name"))}`.trim(),
        body: "Để thông tin khớp với thực tế. Cảm ơn bạn đã đóng góp nha 💙",
        tone: "primary",
        icon: "wrench",
        actionLabel: payload.targetType === "food" ? "Xem món" : null,
      };
    }
    case "contribution_resubmitted":
      return {
        title: `${subject(payload)} đã được sửa theo góp ý của bạn`,
        body: "Đang chờ bạn duyệt lại trong hàng chờ.",
        tone: "secondary",
        icon: "refresh",
        actionLabel: "Mở hàng chờ",
      };
    case "category_proposal_approved":
      return {
        title: `Danh mục ${quoted(str(payload, "categoryName"))} đã được tạo từ đề xuất của bạn`,
        body: "Các món bạn gửi kèm đề xuất đã được xếp vào danh mục mới 🎉",
        tone: "success",
        icon: "tag",
        actionLabel: null,
      };
    case "category_proposal_rejected":
      return {
        title: `Đề xuất danh mục ${quoted(str(payload, "proposalName"))} chưa được duyệt`,
        body:
          reasonLine("Lý do", str(payload, "reason")) ??
          "Món của bạn vẫn giữ các danh mục khác đã chọn (hoặc nằm trong “Khác”).",
        tone: "warning",
        icon: "tag",
        actionLabel: null,
      };
    case "category_proposal_merged":
      return {
        title: `Đề xuất ${quoted(str(payload, "proposalName"))} đã được gộp vào danh mục ${quoted(str(payload, "categoryName"))}`,
        body: "Các món bạn gửi kèm đã được chuyển sang danh mục này.",
        tone: "primary",
        icon: "tag",
        actionLabel: null,
      };
    case "report_handled":
      return buildReportHandled(payload);
    case "report_created":
      return {
        title: `Có báo cáo mới về một ${targetLabel(payload, false)}`,
        body: "Đang chờ xử lý trong mục Xử lý báo cáo.",
        tone: "secondary",
        icon: "flag",
        actionLabel: "Xử lý",
      };
    case "content_removed": {
      const name = quoted(str(payload, "name"));
      const title =
        payload.targetType === "review"
          ? name
            ? `Đánh giá của bạn cho món ${name} đã bị gỡ`
            : "Một đánh giá của bạn đã bị gỡ"
          : `${subject(payload)} của bạn đã bị gỡ`;
      const warningCount = typeof payload.warningCount === "number" ? payload.warningCount : null;
      const lines = [
        reasonLine("Lý do", str(payload, "reason")),
        warningCount
          ? `Đây là lần nhắc nhở thứ ${warningCount} — mong bạn giúp tụi mình giữ không gian văn minh nha.`
          : null,
      ].filter(Boolean);
      return { title, body: lines.join(" ") || null, tone: "warning", icon: "trash", actionLabel: null };
    }
    case "account_banned":
      return {
        title: "Tài khoản của bạn đã bị khoá",
        body: reasonLine("Lý do", str(payload, "reason")),
        tone: "warning",
        icon: "lock",
        actionLabel: null,
      };
    case "account_unbanned":
      return {
        title: "Tài khoản của bạn đã được mở khoá",
        body: "Chào mừng bạn quay lại 💙",
        tone: "success",
        icon: "unlock",
        actionLabel: null,
      };
    case "role_changed": {
      const next = ROLE_LABELS[str(payload, "newRole")] ?? str(payload, "newRole");
      const previous = ROLE_LABELS[str(payload, "previousRole")] ?? str(payload, "previousRole");
      return {
        title: `Vai trò của bạn đã đổi thành ${next}`,
        body: previous ? `Vai trò trước đó: ${previous}.` : null,
        tone: "primary",
        icon: "badge",
        actionLabel: null,
      };
    }
    case "reviewer_application_result":
      return payload.decision === "approved"
        ? {
            title: "Đơn ứng tuyển FoodReviewer của bạn đã được duyệt 🎉",
            body: "Từ giờ bạn có thể vào khu vực thẩm định để duyệt món mới.",
            tone: "success",
            icon: "badge",
            actionLabel: "Vào thẩm định",
          }
        : {
            title: "Đơn ứng tuyển FoodReviewer chưa được duyệt",
            body: reasonLine("Lý do", str(payload, "reason")),
            tone: "warning",
            icon: "badge",
            actionLabel: null,
          };
    case "password_changed":
      return buildPasswordChanged(payload);
    case "login_failed":
      return {
        title: "Có một lần đăng nhập không thành công vào tài khoản của bạn",
        body:
          payload.reason === "banned"
            ? "Tài khoản đang bị khoá nên không đăng nhập được."
            : "Sai mật khẩu. Nếu không phải bạn, nên đổi mật khẩu ngay nhé.",
        tone: "warning",
        icon: "alert",
        actionLabel: null,
      };
  }
}

function buildReportHandled(payload: Payload): NotificationContent {
  const base = { tone: "primary" as const, icon: "flag" as const, actionLabel: null };
  if (payload.outcome === "removed") {
    return { ...base, title: "Đánh giá bạn báo cáo đã được gỡ", body: "Cảm ơn bạn đã giúp cộng đồng 💙" };
  }
  if (payload.outcome === "updated") {
    const title =
      payload.detail === "closed"
        ? "Quán bạn báo đã được đánh dấu ngừng hoạt động"
        : payload.detail === "merged"
          ? "Quán trùng bạn báo đã được gộp lại"
          : "Thông tin bạn báo đã được cập nhật";
    return { ...base, title, body: "Cảm ơn bạn nha 💙" };
  }
  return payload.targetType === "review"
    ? {
        ...base,
        title: "Tụi mình đã xem đánh giá bạn báo cáo",
        body: "Đánh giá này hiện vẫn phù hợp nên được giữ lại. Cảm ơn bạn đã báo nha 💙",
      }
    : {
        ...base,
        title: "Tụi mình đã kiểm tra thông tin bạn báo",
        body: "Thông tin hiện vẫn đúng, có gì khác bạn cứ báo tiếp nha 💙",
      };
}

function buildPasswordChanged(payload: Payload): NotificationContent {
  const titles: Record<string, string> = {
    change: "Mật khẩu của bạn vừa được đổi",
    set: "Bạn vừa tạo mật khẩu cho tài khoản",
    link: "Tài khoản vừa được thêm đăng nhập bằng mật khẩu",
    reset: "Mật khẩu vừa được đặt lại qua “Quên mật khẩu”",
  };
  return {
    title: titles[str(payload, "method")] ?? titles.change,
    body:
      payload.method === "reset"
        ? "Các thiết bị khác đã được đăng xuất. Nếu không phải bạn, hãy liên hệ tụi mình ngay."
        : "Nếu không phải bạn, hãy đổi mật khẩu ngay và liên hệ tụi mình.",
    tone: "primary",
    icon: "key",
    actionLabel: null,
  };
}

/** Tiêu đề cho nhóm ≥ 2 thông báo cùng loại (groupNotifications.ts). */
export function buildGroupTitle(type: NotificationType, count: number): string {
  switch (type) {
    case "food_approved":
      return `${count} đóng góp của bạn đã được duyệt`;
    case "content_corrected":
      return `Tụi mình đã chỉnh thông tin ${count} đóng góp của bạn`;
    case "report_handled":
      return `${count} báo cáo của bạn đã được xử lý`;
    case "report_created":
      return `${count} báo cáo mới đang chờ xử lý`;
    case "category_proposal_approved":
    case "category_proposal_rejected":
    case "category_proposal_merged":
      return `${count} đề xuất danh mục của bạn đã được xử lý`;
    default:
      return `${count} thông báo mới`;
  }
}

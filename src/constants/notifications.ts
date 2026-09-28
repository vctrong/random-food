/** Danh sách loại thông báo + quy tắc kênh — nguồn duy nhất, xem docs/notifications.md mục 1. */
export const NOTIFICATION_TYPES = [
  "food_approved",
  "food_rejected",
  "food_needs_revision",
  "content_corrected",
  "contribution_resubmitted",
  "category_proposal_approved",
  "category_proposal_rejected",
  "category_proposal_merged",
  "report_handled",
  "report_created",
  "content_removed",
  "account_banned",
  "account_unbanned",
  "role_changed",
  "reviewer_application_result",
  "password_changed",
  "login_failed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Email tuỳ chọn — user bật/tắt trong Cài đặt; giá trị là mặc định. */
export const OPTIONAL_EMAIL_DEFAULTS = {
  food_approved: true,
  food_rejected: true,
  food_needs_revision: true,
  content_removed: false,
} as const satisfies Partial<Record<NotificationType, boolean>>;

export type OptionalEmailType = keyof typeof OPTIONAL_EMAIL_DEFAULTS;

/** Email bắt buộc — user không tắt được. Ngoại lệ theo payload xử lý trong isMandatoryEmail(). */
export const MANDATORY_EMAIL_TYPES: readonly NotificationType[] = [
  "account_banned",
  "account_unbanned",
  "role_changed",
  "reviewer_application_result",
  "password_changed",
];

export function isOptionalEmailType(type: string): type is OptionalEmailType {
  return Object.prototype.hasOwnProperty.call(OPTIONAL_EMAIL_DEFAULTS, type);
}

export function isMandatoryEmail(type: NotificationType, payload: Record<string, unknown>): boolean {
  if (!MANDATORY_EMAIL_TYPES.includes(type)) return false;
  // Chỉ duyệt đơn mới đổi role → bắt buộc; bị từ chối thì không gửi email.
  if (type === "reviewer_application_result") return payload.decision === "approved";
  // Quên mật khẩu đã tự gửi email xác nhận riêng — không gửi trùng.
  if (type === "password_changed") return payload.method !== "reset";
  return true;
}

/** Nhãn mục đã chỉnh trong content_corrected (payload.fields). */
export const CORRECTED_FIELD_LABELS: Record<string, string> = {
  price: "giá",
  name: "tên",
  description: "mô tả",
  images: "ảnh",
  address: "địa chỉ",
  location: "vị trí trên bản đồ",
  openingHours: "giờ mở cửa",
};

/** Số ngày giữ thông báo trước khi TTL index tự xoá. */
export const NOTIFICATION_RETENTION_DAYS = 90;

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_PAGE_SIZE_MAX = 50;

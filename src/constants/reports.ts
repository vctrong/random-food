/**
 * Luồng báo cáo (docs/report-flow.md, BR-M06→M14). Lý do báo cáo món/quán nằm
 * chung 1 form ở trang chi tiết món — mỗi lý do tự quyết định báo cáo nhắm vào
 * MÓN hay QUÁN (`target`).
 */

export type ReportTargetType = "review" | "food" | "restaurant";

export const REVIEW_REPORT_REASONS = [
  { id: "spam", label: "Spam / quảng cáo" },
  { id: "offensive", label: "Ngôn từ xúc phạm" },
  { id: "off_topic", label: "Không liên quan tới món" },
  { id: "false_info", label: "Sai sự thật" },
  { id: "personal_info", label: "Lộ thông tin cá nhân" },
  { id: "other", label: "Khác" },
] as const;

export const PLACE_REPORT_REASONS = [
  { id: "closed", label: "Quán đã đóng cửa", target: "restaurant" },
  { id: "wrong_address", label: "Sai địa chỉ / vị trí", target: "restaurant" },
  { id: "wrong_price", label: "Sai giá", target: "food" },
  { id: "duplicate", label: "Trùng với quán khác", target: "restaurant" },
  { id: "wrong_image", label: "Ảnh không đúng", target: "food" },
  { id: "other", label: "Khác", target: "food" },
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]["id"];
export type PlaceReportReason = (typeof PLACE_REPORT_REASONS)[number]["id"];
export type ReportReason = ReviewReportReason | PlaceReportReason;

export const REPORT_REASON_IDS = [
  ...new Set([...REVIEW_REPORT_REASONS.map((reason) => reason.id), ...PLACE_REPORT_REASONS.map((reason) => reason.id)]),
] as ReportReason[];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = Object.fromEntries([
  ...PLACE_REPORT_REASONS.map((reason) => [reason.id, reason.label]),
  ...REVIEW_REPORT_REASONS.map((reason) => [reason.id, reason.label]),
]) as Record<ReportReason, string>;

export function reasonsForTarget(targetType: ReportTargetType): readonly ReportReason[] {
  if (targetType === "review") return REVIEW_REPORT_REASONS.map((reason) => reason.id);
  return PLACE_REPORT_REASONS.filter((reason) => reason.target === targetType).map((reason) => reason.id);
}

export function placeReasonTarget(reason: PlaceReportReason): "food" | "restaurant" {
  return PLACE_REPORT_REASONS.find((item) => item.id === reason)?.target ?? "food";
}

export const MAX_REPORT_NOTE_LENGTH = 300;
export const MAX_REPORTS_PER_DAY = 20;
/** Đánh giá bị báo cáo bởi ≥ 3 user khác nhau → tự ẩn tạm chờ xử lý. Món/quán không tự ẩn. */
export const REVIEW_AUTO_HIDE_THRESHOLD = 3;

export const REPORT_THANK_YOU_TOAST = "Cảm ơn nha, tụi mình sẽ xem xét sớm 💙";

export type ReportCaseStatus = "pending" | "resolved" | "dismissed";

export type ReportCaseAction =
  | "dismiss"
  | "remove_review"
  | "remove_review_warn"
  | "edit_info"
  | "mark_closed"
  | "merge_restaurant";

export const REPORT_CASE_ACTION_LABELS: Record<ReportCaseAction, string> = {
  dismiss: "Bỏ qua",
  remove_review: "Gỡ đánh giá",
  remove_review_warn: "Gỡ + cảnh cáo tác giả",
  edit_info: "Sửa thông tin",
  mark_closed: "Đánh dấu quán đã đóng cửa",
  merge_restaurant: "Gộp quán trùng",
};

/** Lý do xử lý chọn nhanh (Admin vẫn tự gõ được). */
export const RESOLUTION_PRESETS: Record<"dismiss" | "remove" | "place", string[]> = {
  dismiss: ["Nội dung không vi phạm quy định", "Thông tin vẫn đúng tại thời điểm kiểm tra", "Báo cáo chưa đủ căn cứ"],
  remove: ["Spam / quảng cáo", "Ngôn từ xúc phạm", "Không liên quan tới món", "Chứa thông tin cá nhân"],
  place: ["Đã kiểm tra và cập nhật theo thực tế", "Xác nhận quán đã ngừng hoạt động", "Xác nhận trùng với quán đã có"],
};

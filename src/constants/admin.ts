export const ROLE_LABELS: Record<string, string> = {
  user: "Thành viên",
  foodreviewer: "FoodReviewer",
  admin: "Admin",
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  banned: "Đã khoá",
};

export const MODERATION_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  needs_revision: "Cần sửa",
};

export const REPORT_ACTION_LABELS: Record<string, string> = {
  keep: "Giữ nguyên (bác bỏ báo cáo)",
  hide: "Ẩn nội dung",
  remove: "Gỡ nội dung",
  warn_user: "Cảnh cáo người đăng",
  ban_user: "Khoá tài khoản người đăng",
};

export const REPORT_TARGET_LABELS: Record<string, string> = {
  food: "Món ăn",
  restaurant: "Quán ăn",
  review: "Đánh giá",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  approve_food: "Duyệt nội dung",
  reject_food: "Từ chối nội dung",
  needs_revision: "Yêu cầu chỉnh sửa",
  ban_user: "Khoá tài khoản",
  unban_user: "Mở khoá tài khoản",
  hide_review: "Đổi trạng thái đánh giá",
  delete_food: "Xoá nội dung",
  assign_reviewer: "Gán FoodReviewer",
  remove_reviewer: "Gỡ FoodReviewer",
  change_user_role: "Đổi vai trò người dùng",
  set_visibility: "Đổi hiển thị nội dung",
  approve_reviewer_application: "Duyệt đơn ứng tuyển Reviewer",
  reject_reviewer_application: "Từ chối đơn ứng tuyển Reviewer",
  category_create: "Tạo danh mục",
  category_update: "Cập nhật danh mục",
  category_delete: "Xoá danh mục",
  handle_report: "Xử lý báo cáo",
};

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  food: "Món ăn",
  restaurant: "Quán ăn",
  review: "Đánh giá",
  user: "Người dùng",
  category: "Danh mục",
  report: "Báo cáo",
};

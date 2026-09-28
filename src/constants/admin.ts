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
  category_proposal_merge: "Gộp đề xuất danh mục",
  category_proposal_reject: "Từ chối đề xuất danh mục",
  category_proposal_approve: "Tạo danh mục từ đề xuất",
  report_case_resolve: "Xử lý báo cáo",
  report_case_dismiss: "Bỏ qua báo cáo",
  restaurant_close: "Đánh dấu quán đóng cửa",
  restaurant_reopen: "Mở lại quán",
  restaurant_merge: "Gộp quán trùng",
  content_edit: "Sửa thông tin nội dung",
  handle_report: "Xử lý báo cáo",
  announcement_create: "Tạo thông báo chính thức",
  announcement_update: "Sửa thông báo chính thức",
  announcement_publish: "Đăng thông báo chính thức",
  announcement_delete: "Gỡ thông báo chính thức",
};

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  food: "Món ăn",
  restaurant: "Quán ăn",
  review: "Đánh giá",
  user: "Người dùng",
  category: "Danh mục",
  report: "Báo cáo",
  announcement: "Thông báo chính thức",
};

/** Lý do chọn nhanh khi Admin gỡ (ẩn) nội dung — gửi kèm thông báo content_removed tới tác giả. */
export const REMOVAL_REASON_PRESETS: Record<"review" | "place", string[]> = {
  review: ["Spam / quảng cáo", "Ngôn từ xúc phạm", "Không liên quan tới món", "Chứa thông tin cá nhân"],
  place: ["Thông tin không chính xác", "Quán đã ngừng hoạt động", "Trùng với nội dung đã có", "Hình ảnh không phù hợp"],
};

export const REMOVAL_REASON_MAX_LENGTH = 300;

import type { AnnouncementError } from "@/lib/announcements";

export const ANNOUNCEMENT_ERROR_MESSAGES: Record<AnnouncementError, string> = {
  INVALID_INPUT: "Thông tin chưa hợp lệ — kiểm tra tiêu đề, mô tả ngắn, loại và đối tượng.",
  INVALID_CONTENT: "Nội dung đang trống hoặc có ảnh không phải tải lên từ trình soạn thảo.",
  INVALID_SLUG: "Đường dẫn (slug) chỉ gồm chữ thường không dấu, số và dấu gạch ngang.",
  SLUG_TAKEN: "Đường dẫn này đã có thông báo khác dùng rồi.",
  INVALID_SCHEDULE: "Ngày hết hạn phải sau thời điểm đăng.",
  NOT_FOUND: "Không tìm thấy thông báo.",
};

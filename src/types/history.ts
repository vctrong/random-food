import type { EatingLevel } from "./food";

export interface HistoryReviewSummary {
  id: string;
  rating: number;
  comment: string | null;
  /** ISO datetime lúc tạo review — mốc tính hạn sửa 24h. */
  createdAt: string;
  /** Đã bị xoá sau 24h (xoá mềm) — không thể đánh giá lại món này. */
  isDeleted: boolean;
}

export interface HistoryEntry {
  id: string;
  foodId: string;
  /** ISO datetime của lần random/chọn món */
  timestamp: string;
  eatingLevel: EatingLevel | null;
  /** Đã đánh dấu là ăn món này thật hay chỉ mới random ra */
  wasEaten: boolean;
  isSaved: boolean;
  /** Review thật của user cho món này (1 review/user/món — chia sẻ giữa mọi lần check-in cùng món). null nếu chưa đánh giá. */
  review: HistoryReviewSummary | null;
}

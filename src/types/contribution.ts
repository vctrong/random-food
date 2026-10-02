import type { AchievementId } from "@/constants/contribution";
import type { EatingLevel } from "@/types/food";

/** Trạng thái kiểm duyệt (`moderationStatus`) của Food/Restaurant — docs/contribute-food.md mục 8. */
export type ContributionStatus = "pending" | "in_review" | "approved" | "needs_revision" | "rejected" | "withdrawn";

/** Trạng thái hiển thị gộp: thêm `hidden` khi Admin ẩn 1 món đã duyệt (`visibility = hidden`). */
export type ContributionDisplayStatus = ContributionStatus | "hidden";

/** Tab "pending" gồm cả `in_review` (khác nhau ở badge). */
export type ContributionTab = "all" | "approved" | "pending" | "needs_revision" | "rejected" | "withdrawn";

export type ContributionSort = "newest" | "oldest" | "most_saved" | "top_rated";

export interface ContributionRestaurant {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number } | null;
  status: ContributionStatus;
  moderationNote: string | null;
  /** Quán do chính user tạo kèm món (BR-C07). */
  isOwnedByUser: boolean;
  /** Sửa được tên / địa chỉ / vị trí: quán mới do user tạo, còn pending, đề xuất đang pending. */
  canEditDetails: boolean;
}

/** 1 lần FoodReviewer ra quyết định, lấy từ AuditLog — lịch sử phản hồi của 1 đóng góp. */
export interface ContributionFeedback {
  id: string;
  targetType: "food" | "restaurant";
  decision: "approved" | "needs_revision" | "rejected";
  reason: string | null;
  createdAt: string;
}

export interface Contribution {
  id: string;
  name: string;
  description: string;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  eatingLevels: EatingLevel[];
  categories: { id: string; name: string }[];
  status: ContributionDisplayStatus;
  foodStatus: ContributionStatus;
  moderationNote: string | null;
  restaurant: ContributionRestaurant | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  saveCount: number;
  avgRating: number;
  ratingCount: number;
  feedbackHistory: ContributionFeedback[];
  /** Quyền sửa hiện tại (còn lượt sửa): food = nhóm nhẹ, restaurant = nhóm nặng (đổi quán / sửa quán mới) — chỉ khi pending. */
  editable: { food: boolean; restaurant: boolean };
  /** Lượt sửa còn lại khi `pending`; null = không giới hạn (needs_revision) hoặc không sửa được. */
  remainingEdits: number | null;
  canWithdraw: boolean;
  /** Đang `in_review` còn hạn — gửi được ghi chú đính chính. */
  canSendNote: boolean;
  /** Ghi chú đính chính user đã gửi, cũ → mới. */
  notes: SubmissionNoteItem[];
  createdAt: string;
  updatedAt: string;
}

/** Thành tựu đã lưu trong DB — `unlockedAt = null` nghĩa là chưa mở khoá. */
export interface AchievementStatus {
  id: AchievementId;
  unlockedAt: string | null;
}

export interface SubmissionNoteItem {
  id: string;
  content: string;
  createdAt: string;
}

export interface ContributionSummary {
  total: number;
  approved: number;
  /** Gồm cả `in_review`. */
  pending: number;
  needsRevision: number;
  rejected: number;
  withdrawn: number;
}

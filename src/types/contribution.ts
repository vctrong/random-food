import type { AchievementId } from "@/constants/contribution";
import type { EatingLevel } from "@/types/food";

/** Trạng thái kiểm duyệt (`moderationStatus`) của Food/Restaurant — docs/BR_UC.md mục 4. */
export type ContributionStatus = "pending" | "approved" | "needs_revision" | "rejected";

/** Trạng thái hiển thị gộp: thêm `hidden` khi Admin ẩn 1 món đã duyệt (`visibility = hidden`). */
export type ContributionDisplayStatus = ContributionStatus | "hidden";

export type ContributionTab = "all" | "approved" | "pending" | "needs_revision" | "rejected";

export type ContributionSort = "newest" | "oldest" | "most_saved" | "top_rated";

export interface ContributionRestaurant {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number } | null;
  status: ContributionStatus;
  moderationNote: string | null;
  /** Quán do chính user tạo kèm món (BR-C07) — chỉ khi đó mới được sửa cùng món. */
  isOwnedByUser: boolean;
}

/** 1 lần FoodReviewer ra quyết định, lấy từ AuditLog — lịch sử phản hồi của 1 đóng góp. */
export interface ContributionFeedback {
  id: string;
  targetType: "food" | "restaurant";
  decision: Exclude<ContributionStatus, "pending">;
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
  editable: { food: boolean; restaurant: boolean };
  createdAt: string;
  updatedAt: string;
}

/** Thành tựu đã lưu trong DB — `unlockedAt = null` nghĩa là chưa mở khoá. */
export interface AchievementStatus {
  id: AchievementId;
  unlockedAt: string | null;
}

export interface ContributionSummary {
  total: number;
  approved: number;
  pending: number;
  needsRevision: number;
  rejected: number;
}

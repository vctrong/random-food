/**
 * Type cho khu vực thẩm định FoodReviewer (docs/BR_UC.md mục 3.3, UC-F01→F09).
 * Không có model DB riêng — dữ liệu ghép từ Food/Restaurant (moderationStatus)
 * + AuditLog (lịch sử quyết định), xem src/lib/reviewerData.ts.
 */

import type { LocationSource, OpeningSchedule } from "@/types/restaurant";

export type ModerationTargetType = "food" | "restaurant";

export type ModerationDecision = "approved" | "rejected" | "needs_revision";

export interface ReviewSubmitter {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Danh mục user đề xuất kèm món — FoodReviewer chỉ được gộp hoặc từ chối (docs/contribute-food.md). */
export interface ReviewQueueProposal {
  id: string;
  name: string;
  proposalCount: number;
  /** Số món đang dùng đề xuất này — quyết định áp dụng cho tất cả. */
  foodCount: number;
  status: "pending" | "approved" | "rejected" | "merged";
}

export interface ReviewQueueNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface ReviewQueueItem {
  targetType: ModerationTargetType;
  id: string;
  /** Món: pending (chờ nhận) | in_review (tôi đang giữ). Quán đứng riêng (dữ liệu cũ) luôn pending. */
  status: "pending" | "in_review";
  /** false = quán đứng riêng (dữ liệu cũ) — quyết định thẳng, không cần nhận. */
  requiresClaim: boolean;
  claimedAt: string | null;
  /** Mốc tự nhả nếu chưa xử lý (claimedAt + CLAIM_TTL_HOURS). */
  claimExpiresAt: string | null;
  /** Món kèm quán mới user tạo (đang chờ duyệt) — duyệt/từ chối món sẽ áp dụng luôn cho quán. */
  hasNewRestaurant: boolean;
  /** Quán của món (null với mục quán đứng riêng — khi đó `id` chính là quán). */
  restaurantId: string | null;
  /** Số lần user đã tự sửa khi còn chờ nhận. */
  editCount: number;
  /** Ghi chú đính chính của người gửi — chỉ có với đề xuất tôi đang giữ. */
  notes: ReviewQueueNote[];
  name: string;
  description: string;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  address: string | null;
  location: { lat: number; lng: number } | null;
  categoryNames: string[];
  eatingLevels: string[];
  restaurantName: string | null;
  /** Giờ mở cửa của quán (đã resolve chuỗi cũ); null khi món không có quán. */
  openingSchedule: OpeningSchedule | null;
  /** Ảnh quán (quán mới, hoặc quán của món) — rỗng thì hiển thị ảnh mặc định. */
  restaurantImages: string[];
  /** Độ tin cậy vị trí quán; null = dữ liệu cũ chưa có field. */
  locationSource: LocationSource | null;
  proposal: ReviewQueueProposal | null;
  submitter: ReviewSubmitter;
  createdAt: string;
  /** BR-F02/F03: true nếu chính reviewer đang xem là người đóng góp. */
  isSelfSubmitted: boolean;
  /** false khi BR-F02/F03 áp dụng, hoặc chưa nhận xác minh — không cho phép quyết định. */
  canDecide: boolean;
  lockReason: string | null;
}

export interface ReviewQueue {
  /** Tab "Chờ nhận": món pending + quán đứng riêng (dữ liệu cũ). */
  available: ReviewQueueItem[];
  /** Tab "Đang giữ": món in_review do tôi giữ, còn hạn. */
  mine: ReviewQueueItem[];
}

export interface ReviewHistoryEntry {
  logId: string;
  targetType: ModerationTargetType;
  targetId: string;
  name: string;
  images: string[];
  address: string | null;
  priceMin: number | null;
  priceMax: number | null;
  categoryNames: string[];
  submitter: ReviewSubmitter;
  decision: ModerationDecision;
  reason: string | null;
  decidedAt: string;
  submittedAt: string | null;
  processingMinutes: number | null;
}

export interface ReviewHistorySummary {
  total: number;
  approved: number;
  needsRevision: number;
  rejected: number;
  last7Days: number;
  avgProcessingMinutes: number | null;
}

export type ReviewHistoryStatusFilter = "all" | "approved" | "needs_revision" | "rejected";

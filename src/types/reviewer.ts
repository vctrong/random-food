/**
 * Type cho khu vực thẩm định FoodReviewer (docs/BR_UC.md mục 3.3, UC-F01→F09).
 * Không có model DB riêng — dữ liệu ghép từ Food/Restaurant (moderationStatus)
 * + AuditLog (lịch sử quyết định), xem src/lib/reviewerData.ts.
 */

import type { LocationSource } from "@/types/restaurant";

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

export interface ReviewQueueItem {
  targetType: ModerationTargetType;
  id: string;
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
  openingHours: string | null;
  /** Ảnh quán (quán mới, hoặc quán của món) — rỗng thì hiển thị ảnh mặc định. */
  restaurantImages: string[];
  /** Độ tin cậy vị trí quán; null = dữ liệu cũ chưa có field. */
  locationSource: LocationSource | null;
  proposal: ReviewQueueProposal | null;
  submitter: ReviewSubmitter;
  createdAt: string;
  /** BR-F02/F03: true nếu chính reviewer đang xem là người đóng góp. */
  isSelfSubmitted: boolean;
  /** false khi BR-F02/F03 áp dụng — không cho phép reviewer này tự quyết định. */
  canDecide: boolean;
  lockReason: string | null;
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

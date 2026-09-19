import type { SocialPlatformId } from "@/constants/reviewerApplication";

export type ReviewerApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface ReviewerApplicationSocialLink {
  platform: SocialPlatformId;
  url: string;
}

/** Đơn ứng tuyển của chính user, đã chuẩn hoá cho UI. */
export interface ReviewerApplicationView {
  id: string;
  status: ReviewerApplicationStatus;
  fullName: string;
  motivation: string;
  expertise: { id: string; name: string }[];
  activeAreas: string[];
  socialLinks: ReviewerApplicationSocialLink[];
  portfolioImages: string[];
  scenarioAnswer: string;
  agreedAt: string | null;
  /** Ghi chú duyệt/từ chối của Admin. */
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Ai được nộp đơn lúc này — quyết định trang hiện form hay hiện trạng thái. */
export type ReviewerApplicationAccess =
  | { state: "eligible" }
  | { state: "already_reviewer" }
  | { state: "pending" }
  | { state: "cooldown"; until: string };

export interface ReviewerApplicationOverview {
  access: ReviewerApplicationAccess;
  /** Đơn mới nhất (mọi trạng thái), null nếu chưa từng nộp. */
  application: ReviewerApplicationView | null;
}

/** Dữ liệu form, dùng chung cho validate ở client và server. */
export interface ReviewerApplicationFields {
  fullName: string;
  motivation: string;
  expertiseCategoryIds: string[];
  activeAreas: string[];
  socialLinks: ReviewerApplicationSocialLink[];
  portfolioCount: number;
  scenarioAnswer: string;
  acceptedCommitmentIds: string[];
}

export type ReviewerApplicationFieldKey =
  | "fullName"
  | "motivation"
  | "expertiseCategoryIds"
  | "activeAreas"
  | "socialLinks"
  | "portfolio"
  | "scenarioAnswer"
  | "commitments";

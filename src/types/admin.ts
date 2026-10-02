import type { CategoryGroup } from "@/constants/categoryGroups";
import type { ReportCaseAction, ReportCaseStatus, ReportReason, ReportTargetType } from "@/constants/reports";
import type { LocationSource } from "@/types/restaurant";

export type { ReportTargetType };
/** Type cho toàn bộ khu vực Admin (src/app/admin, src/lib/admin, src/app/api/admin). */

export interface AdminOverviewStats {
  totalUsers: number;
  bannedUsers: number;
  pendingFoods: number;
  pendingRestaurants: number;
  pendingReports: number;
  pendingReviewerApplications: number;
  pendingCategoryProposals: number;
  auditLogLast7Days: number;
}

export interface AdminActivityEntry {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetName: string | null;
  reason: string | null;
  createdAt: string;
}

export type UserRole = "user" | "foodreviewer" | "admin";
export type AccountStatus = "active" | "banned";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  warningCount: number;
  authProvider: "local" | "google";
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Hồ sơ ứng viên khai trong form; null với đơn cũ tạo trước khi có form ứng tuyển. */
export interface AdminReviewerApplicationProfile {
  fullName: string;
  motivation: string;
  expertise: string[];
  activeAreas: string[];
  socialLinks: { platform: string; url: string }[];
  portfolioImages: string[];
  scenarioAnswer: string;
  agreedAt: string | null;
}

export interface AdminReviewerApplicationRow {
  id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  /** Ghi chú duyệt/từ chối của Admin. */
  reviewNote: string | null;
  profile: AdminReviewerApplicationProfile | null;
  applicant: { id: string; name: string; email: string; avatarUrl: string | null };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export type ContentTargetType = "food" | "restaurant";
export type ModerationStatus = "pending" | "in_review" | "approved" | "rejected" | "needs_revision" | "withdrawn";

export interface AdminContentRow {
  targetType: ContentTargetType;
  id: string;
  name: string;
  description: string;
  images: string[];
  address: string | null;
  priceMin: number | null;
  priceMax: number | null;
  moderationStatus: ModerationStatus;
  visibility: "visible" | "hidden" | "deleted";
  moderationNote: string | null;
  submitter: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  group: CategoryGroup;
  foodCount: number;
  /** Danh mục hệ thống "Khác" — không tắt/xoá được. */
  isSystem: boolean;
  createdAt: string;
}

export interface AdminCategoryProposalRow {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "merged";
  proposalCount: number;
  /** Món đang dùng đề xuất — quyết định áp dụng cho tất cả. */
  foods: { id: string; name: string; status: string }[];
  proposedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: "visible" | "hidden";
  user: { id: string; name: string; avatarUrl: string | null };
  foodName: string | null;
  restaurantName: string | null;
  createdAt: string;
}

/** Case báo cáo (gom mọi báo cáo của 1 đối tượng) — docs/report-flow.md. */
export interface AdminReportCaseRow {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  /** Tên món/quán hoặc trích đoạn đánh giá; null nếu đối tượng đã bị xoá. */
  targetLabel: string | null;
  reportCount: number;
  reasonCounts: { reason: ReportReason; count: number }[];
  status: ReportCaseStatus;
  action: ReportCaseAction | null;
  resolutionNote: string | null;
  resolvedBy: { id: string; name: string } | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportEntry {
  id: string;
  reason: ReportReason;
  note: string | null;
  reporter: { id: string; name: string };
  duplicateOf: { id: string; name: string; address: string } | null;
  createdAt: string;
}

export interface AdminReportCaseAuthor {
  id: string;
  name: string;
  warningCount: number;
  accountStatus: AccountStatus;
}

export type AdminReportCaseTarget =
  | {
      type: "review";
      id: string;
      rating: number;
      comment: string | null;
      status: "visible" | "hidden" | "hidden_pending_review";
      food: { id: string; name: string } | null;
      author: AdminReportCaseAuthor | null;
    }
  | {
      type: "food";
      id: string;
      name: string;
      description: string;
      images: string[];
      priceMin: number | null;
      priceMax: number | null;
      restaurant: { id: string; name: string } | null;
      author: AdminReportCaseAuthor | null;
    }
  | {
      type: "restaurant";
      id: string;
      name: string;
      address: string;
      location: { lat: number; lng: number } | null;
      locationSource: LocationSource | null;
      openingHours: string | null;
      images: string[];
      businessStatus: "open" | "closed";
      foodCount: number;
      author: AdminReportCaseAuthor | null;
    };

export interface AdminReportCaseDetail extends AdminReportCaseRow {
  reports: AdminReportEntry[];
  target: AdminReportCaseTarget | null;
}

export interface AdminAuditLogRow {
  id: string;
  actor: { id: string; name: string } | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

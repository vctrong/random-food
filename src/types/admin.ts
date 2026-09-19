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
export type ModerationStatus = "pending" | "approved" | "rejected" | "needs_revision";

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
  createdAt: string;
}

export interface AdminCategoryProposalRow {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
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

export type ReportTargetType = "food" | "review" | "restaurant";
export type ReportAction = "keep" | "hide" | "remove" | "warn_user" | "ban_user";

export interface AdminReportRow {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string | null;
  reason: string;
  status: "pending" | "reviewed";
  action: ReportAction | null;
  reporter: { id: string; name: string; avatarUrl: string | null };
  handledBy: { id: string; name: string } | null;
  handledAt: string | null;
  createdAt: string;
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

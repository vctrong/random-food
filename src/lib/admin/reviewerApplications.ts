import { connectDB } from "@/lib/mongodb";
import { FoodReviewerApplication } from "@/lib/models/FoodReviewerApplication";
import { User } from "@/lib/models/User";
import { AuditLog } from "@/lib/models/AuditLog";
import { createNotification } from "@/lib/notify";
import type { AdminReviewerApplicationRow } from "@/types/admin";

interface LeanUserRef {
  _id: unknown;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

function toUserRef(value: unknown): { id: string; name: string; email: string; avatarUrl: string | null } {
  const user = value as LeanUserRef | null;
  if (!user || !user._id) return { id: "", name: "Người dùng đã xoá", email: "", avatarUrl: null };
  return {
    id: String(user._id),
    name: user.name ?? "Người dùng ẩn danh",
    email: user.email ?? "",
    avatarUrl: user.avatarUrl ?? null,
  };
}

export async function getReviewerApplications(): Promise<AdminReviewerApplicationRow[]> {
  await connectDB();
  const applications = await FoodReviewerApplication.find({})
    .sort({ createdAt: -1 })
    .populate("userId", "name email avatarUrl")
    .populate("reviewedBy", "name")
    .populate("expertiseCategoryIds", "name")
    .lean();

  return applications.map((app) => {
    const reviewedBy = app.reviewedBy as unknown as { _id?: unknown; name?: string } | null;
    const expertise = (app.expertiseCategoryIds ?? []) as unknown as { name?: string }[];
    // Đơn tạo trước form ứng tuyển không có hồ sơ chi tiết.
    const hasProfile = Boolean(app.fullName || app.motivation || app.scenarioAnswer);
    return {
      id: String(app._id),
      status: app.status as AdminReviewerApplicationRow["status"],
      // `reason` là tên cũ của reviewNote — đọc dự phòng cho tới khi chạy migration.
      reviewNote: app.reviewNote ?? (app as { reason?: string }).reason ?? null,
      profile: hasProfile
        ? {
            fullName: app.fullName ?? "",
            motivation: app.motivation ?? "",
            expertise: expertise.map((category) => category.name ?? "").filter(Boolean),
            activeAreas: app.activeAreas ?? [],
            socialLinks: (app.socialLinks ?? []).map((link: { platform: string; url: string }) => ({
              platform: link.platform,
              url: link.url,
            })),
            portfolioImages: app.portfolioImages ?? [],
            scenarioAnswer: app.scenarioAnswer ?? "",
            agreedAt: app.agreedAt ? new Date(app.agreedAt).toISOString() : null,
          }
        : null,
      applicant: toUserRef(app.userId),
      reviewedBy: reviewedBy?._id ? { id: String(reviewedBy._id), name: reviewedBy.name ?? "" } : null,
      reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
      createdAt: (app.createdAt ?? new Date()).toISOString(),
    };
  });
}

type DecisionError = "NOT_FOUND" | "NOT_PENDING";

interface DecideInput {
  adminId: string;
  applicationId: string;
  decision: "approved" | "rejected";
  reason: string;
}

export async function decideReviewerApplication({
  adminId,
  applicationId,
  decision,
  reason,
}: DecideInput): Promise<{ error: DecisionError | null }> {
  await connectDB();
  const application = await FoodReviewerApplication.findById(applicationId);
  if (!application) return { error: "NOT_FOUND" };
  if (application.status !== "pending") return { error: "NOT_PENDING" };

  application.status = decision;
  application.reviewNote = reason.trim() || undefined;
  application.reviewedBy = adminId as unknown as typeof application.reviewedBy;
  application.reviewedAt = new Date();
  application.updatedAt = new Date();
  await application.save();

  if (decision === "approved") {
    await User.findByIdAndUpdate(application.userId, { role: "foodreviewer" });
  }

  await AuditLog.create({
    actorId: adminId,
    action: decision === "approved" ? "approve_reviewer_application" : "reject_reviewer_application",
    targetType: "user",
    targetId: application.userId,
    reason: reason.trim() || undefined,
  });

  await createNotification({
    userId: String(application.userId),
    type: "reviewer_application_result",
    message:
      decision === "approved"
        ? "Chúc mừng! Đơn ứng tuyển FoodReviewer của bạn đã được duyệt."
        : `Đơn ứng tuyển FoodReviewer của bạn đã bị từ chối.${reason.trim() ? ` Lý do: ${reason.trim()}` : ""}`,
  });

  return { error: null };
}

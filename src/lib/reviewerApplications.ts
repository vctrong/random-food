import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { uploadImageFile } from "@/lib/cloudinary";
import { FoodReviewerApplication } from "@/lib/models/FoodReviewerApplication";
import { User } from "@/lib/models/User";
import { Category } from "@/lib/models/Category";
import { COMMITMENT_VERSION, REVIEWER_APPLICATION_LIMITS as LIMITS } from "@/constants/reviewerApplication";
import { computeApplicationAccess, validateApplicationFields } from "@/features/reviewer-application/applicationLogic";
import type {
  ReviewerApplicationAccess,
  ReviewerApplicationFields,
  ReviewerApplicationOverview,
  ReviewerApplicationStatus,
  ReviewerApplicationView,
} from "@/types/reviewerApplication";

/**
 * Lớp dữ liệu phía USER cho đơn ứng tuyển FoodReviewer (UC-U19, UC-U20, BR-03).
 * Phần Admin duyệt đơn nằm ở lib/admin/reviewerApplications.ts.
 */

interface LeanApplication {
  _id: unknown;
  status: ReviewerApplicationStatus;
  fullName?: string;
  motivation?: string;
  expertiseCategoryIds?: { _id: unknown; name: string }[];
  activeAreas?: string[];
  socialLinks?: ReviewerApplicationView["socialLinks"];
  portfolioImages?: string[];
  scenarioAnswer?: string;
  agreedAt?: Date;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt?: Date;
}

function toView(application: LeanApplication): ReviewerApplicationView {
  return {
    id: String(application._id),
    status: application.status,
    fullName: application.fullName ?? "",
    motivation: application.motivation ?? "",
    expertise: (application.expertiseCategoryIds ?? []).map((category) => ({ id: String(category._id), name: category.name })),
    activeAreas: application.activeAreas ?? [],
    socialLinks: application.socialLinks ?? [],
    portfolioImages: application.portfolioImages ?? [],
    scenarioAnswer: application.scenarioAnswer ?? "",
    agreedAt: application.agreedAt ? new Date(application.agreedAt).toISOString() : null,
    reviewNote: application.reviewNote ?? null,
    reviewedAt: application.reviewedAt ? new Date(application.reviewedAt).toISOString() : null,
    createdAt: new Date(application.createdAt ?? Date.now()).toISOString(),
  };
}

/** Role lấy từ DB (không tin role trong JWT có thể trễ) — vừa để tính quyền nộp, vừa chặn tài khoản bị khoá. */
async function getApplicantState(userId: string) {
  const user = (await User.findById(userId).select("role accountStatus name").lean()) as {
    role?: string;
    accountStatus?: string;
    name?: string;
  } | null;
  return user;
}

async function getLatestApplication(userId: string): Promise<LeanApplication | null> {
  const latest = (await FoodReviewerApplication.find({ userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .populate("expertiseCategoryIds", "name")
    .lean()) as unknown as LeanApplication[];
  return latest[0] ?? null;
}

function accessFor(role: string, latest: LeanApplication | null): ReviewerApplicationAccess {
  return computeApplicationAccess({
    role,
    latest: latest ? { status: latest.status, reviewedAt: latest.reviewedAt ? new Date(latest.reviewedAt).toISOString() : null } : null,
  });
}

export async function getMyApplicationOverview(userId: string): Promise<ReviewerApplicationOverview & { defaultFullName: string }> {
  await connectDB();
  const [user, latest] = await Promise.all([getApplicantState(userId), getLatestApplication(userId)]);

  return {
    access: accessFor(user?.role ?? "user", latest),
    application: latest ? toView(latest) : null,
    defaultFullName: user?.name ?? "",
  };
}

export type SubmitApplicationError =
  | "NOT_FOUND_USER"
  | "BANNED"
  | "NOT_ELIGIBLE"
  | "INVALID_CATEGORY"
  | "INVALID_IMAGES"
  | "VALIDATION";

export interface SubmitApplicationInput {
  fields: Omit<ReviewerApplicationFields, "portfolioCount">;
  portfolioFiles: File[];
}

export async function submitApplication(
  userId: string,
  input: SubmitApplicationInput,
): Promise<{ error: SubmitApplicationError | null; message?: string; id?: string }> {
  await connectDB();

  const user = await getApplicantState(userId);
  if (!user) return { error: "NOT_FOUND_USER" };
  if (user.accountStatus === "banned") return { error: "BANNED" };

  const latest = await getLatestApplication(userId);
  if (accessFor(user.role ?? "user", latest).state !== "eligible") return { error: "NOT_ELIGIBLE" };

  const errors = validateApplicationFields({ ...input.fields, portfolioCount: input.portfolioFiles.length });
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: "VALIDATION", message: firstError };

  const categoryIds = [...new Set(input.fields.expertiseCategoryIds)];
  if (categoryIds.some((id) => !isValidObjectId(id))) return { error: "INVALID_CATEGORY" };
  const validCategoryCount = await Category.countDocuments({ _id: { $in: categoryIds }, isActive: true });
  if (validCategoryCount !== categoryIds.length) return { error: "INVALID_CATEGORY" };

  const isValidUpload = (file: File) =>
    file.type.startsWith("image/") && file.size > 0 && file.size <= LIMITS.portfolioImageMaxBytes;
  if (!input.portfolioFiles.every(isValidUpload)) return { error: "INVALID_IMAGES" };

  const portfolioImages = await Promise.all(
    input.portfolioFiles.map((file) => uploadImageFile(file, "nayangi/reviewer-applications")),
  );

  const now = new Date();
  try {
    const created = await FoodReviewerApplication.create({
      userId,
      status: "pending",
      fullName: input.fields.fullName.trim(),
      motivation: input.fields.motivation.trim(),
      expertiseCategoryIds: categoryIds,
      activeAreas: input.fields.activeAreas.map((area) => area.trim()).filter(Boolean),
      socialLinks: input.fields.socialLinks.map((link) => ({ platform: link.platform, url: link.url.trim() })),
      portfolioImages,
      scenarioAnswer: input.fields.scenarioAnswer.trim(),
      agreedAt: now,
      commitmentVersion: COMMITMENT_VERSION,
      createdAt: now,
      updatedAt: now,
    });
    return { error: null, id: String(created._id) };
  } catch (error) {
    // Unique index một phần (userId, status = pending): 2 request nộp đồng thời → request sau bị chặn.
    if ((error as { code?: number }).code === 11000) return { error: "NOT_ELIGIBLE" };
    throw error;
  }
}

export type WithdrawApplicationError = "INVALID_ID" | "NOT_FOUND" | "NOT_PENDING";

/** User tự rút đơn đang chờ duyệt; rút xong được nộp đơn mới ngay (không bị cooldown như khi bị từ chối). */
export async function withdrawApplication(userId: string, applicationId: string): Promise<{ error: WithdrawApplicationError | null }> {
  if (!isValidObjectId(applicationId)) return { error: "INVALID_ID" };
  await connectDB();

  const application = await FoodReviewerApplication.findOne({ _id: applicationId, userId });
  if (!application) return { error: "NOT_FOUND" };
  if (application.status !== "pending") return { error: "NOT_PENDING" };

  application.status = "withdrawn";
  application.updatedAt = new Date();
  await application.save();
  return { error: null };
}

/** Danh mục đang bật — dùng cho phần "khẩu vị sở trường" của form. */
export async function listExpertiseOptions(): Promise<{ id: string; name: string }[]> {
  await connectDB();
  const categories = (await Category.find({ isActive: true }).sort({ name: 1 }).lean()) as unknown as { _id: unknown; name: string }[];
  return categories.map((category) => ({ id: String(category._id), name: category.name }));
}

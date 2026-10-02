import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { AuditLog } from "@/lib/models/AuditLog";
import { User } from "@/lib/models/User";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { SubmissionNote } from "@/lib/models/SubmissionNote";
import { notify } from "@/lib/notifications/notify";
import { getFallbackCategoryId } from "@/lib/categoryProposals";
import { recountCategoriesOfFood } from "@/lib/categoryCounts";
import { getContributionOverview } from "@/lib/achievements";
import { validateFoodCategories } from "@/lib/foodSubmission";
import { markImagesUnattached, parseOwnUploadUrl, uploadImageFile } from "@/lib/cloudinary";
import { hitRateLimit } from "@/lib/rateLimit";
import { releaseExpiredClaims } from "@/lib/submissionClaims";
import { normalizeVietnamese } from "@/lib/vietnameseText";
import { isEatingLevel } from "@/constants/categories";
import { MAX_FOOD_IMAGES, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";
import {
  ACTIVE_SUBMISSION_STATUSES,
  HEAVY_FIELDS,
  LIGHT_FIELDS,
  MAX_PENDING_EDITS,
  SUBMISSION_FIELD_LABELS,
  SUBMISSION_NOTE_MAX_LENGTH,
  claimCutoff,
  findBlockedFields,
  isClaimExpired,
  remainingEdits,
  sourceStatuses,
  type SubmissionField,
} from "@/features/contributions/submissionRules";
import type { ModerationDecision } from "@/types/reviewer";
import type { LocationSource } from "@/types/restaurant";

/**
 * NƠI DUY NHẤT đổi trạng thái đề xuất món (docs/contribute-food.md mục 8). Mỗi đề xuất
 * là 1 Food; quán mới user tạo kèm (BR-C07) đi theo món. Mọi chuyển trạng thái là 1
 * `findOneAndUpdate` có điều kiện trạng thái nguồn (lấy từ bảng SUBMISSION_TRANSITIONS),
 * nên 2 thao tác đồng thời không bao giờ cùng thắng — bên thua nhận lỗi rõ ràng.
 */

export type WorkflowError =
  | "INVALID_ID"
  | "NOT_FOUND"
  | "SELF_SUBMITTED"
  | "ALREADY_TAKEN"
  | "NOT_HOLDER"
  | "CLAIM_EXPIRED"
  | "INVALID_TRANSITION"
  | "REASON_REQUIRED"
  | "PART_OF_SUBMISSION"
  | "NOT_IN_REVIEW"
  | "INVALID_NOTE"
  | "RATE_LIMITED"
  | "NOTHING_TO_UPDATE"
  | "FIELDS_BLOCKED"
  | "EDIT_LIMIT"
  | "STATUS_CHANGED"
  | "RESTAURANT_LOCKED"
  | "INVALID_FOOD"
  | "INVALID_PRICE"
  | "INVALID_CATEGORY"
  | "TOO_MANY_CATEGORIES"
  | "INVALID_EATING_LEVEL"
  | "INVALID_IMAGES"
  | "INVALID_RESTAURANT";

export const WORKFLOW_ERRORS: Record<WorkflowError, { message: string; status: number }> = {
  INVALID_ID: { message: "Mã đề xuất không hợp lệ.", status: 400 },
  NOT_FOUND: { message: "Không tìm thấy đề xuất.", status: 404 },
  SELF_SUBMITTED: { message: "Không thể tự xác minh đề xuất do chính bạn gửi (BR-F02/F03).", status: 403 },
  ALREADY_TAKEN: { message: "Đề xuất đã được người khác nhận hoặc đã bị rút.", status: 409 },
  NOT_HOLDER: { message: "Bạn không giữ đề xuất này (đã bị nhả, rút hoặc người khác đang giữ).", status: 403 },
  CLAIM_EXPIRED: { message: "Đã quá hạn giữ đề xuất — hãy nhận xác minh lại nếu đề xuất vẫn còn chờ.", status: 409 },
  INVALID_TRANSITION: { message: "Đề xuất không còn ở trạng thái cho phép thao tác này.", status: 409 },
  REASON_REQUIRED: { message: "Cần nhập lý do khi từ chối hoặc yêu cầu chỉnh sửa.", status: 400 },
  PART_OF_SUBMISSION: { message: "Quán này đi kèm một đề xuất món — hãy xử lý qua đề xuất món đó.", status: 409 },
  NOT_IN_REVIEW: { message: "Chỉ gửi được ghi chú đính chính khi đề xuất đang được xác minh.", status: 409 },
  INVALID_NOTE: { message: `Ghi chú cần từ 1 đến ${SUBMISSION_NOTE_MAX_LENGTH} ký tự.`, status: 400 },
  RATE_LIMITED: { message: "Bạn gửi ghi chú hơi nhanh, đợi một lát rồi thử lại nha.", status: 429 },
  NOTHING_TO_UPDATE: { message: "Không có thay đổi nào để gửi.", status: 400 },
  FIELDS_BLOCKED: { message: "Một số mục không được sửa ở trạng thái hiện tại.", status: 403 },
  EDIT_LIMIT: {
    message: `Bạn đã sửa đủ ${MAX_PENDING_EDITS} lần. Nếu còn sai, hãy rút đề xuất này và tạo đề xuất mới.`,
    status: 409,
  },
  STATUS_CHANGED: {
    message: "Đề xuất vừa đổi trạng thái (có thể đã được nhận xác minh) nên chưa lưu được — tải lại để xem.",
    status: 409,
  },
  RESTAURANT_LOCKED: {
    message: "Quán này đã có sẵn trong hệ thống nên không sửa tên/địa chỉ được — nếu chọn nhầm, hãy đổi sang quán khác.",
    status: 403,
  },
  INVALID_FOOD: { message: "Thiếu tên món ăn.", status: 400 },
  INVALID_PRICE: { message: "Giá tham khảo không hợp lệ.", status: 400 },
  INVALID_CATEGORY: { message: "Chọn ít nhất 1 danh mục hợp lệ.", status: 400 },
  TOO_MANY_CATEGORIES: { message: "Mỗi món tối đa 3 danh mục, tính cả danh mục đề xuất.", status: 400 },
  INVALID_EATING_LEVEL: { message: "Chọn ít nhất 1 mức độ ăn hợp lệ.", status: 400 },
  INVALID_IMAGES: { message: "Cần 1–5 ảnh, mỗi ảnh là tệp hình dưới 5MB.", status: 400 },
  INVALID_RESTAURANT: { message: "Thiếu tên, địa chỉ hoặc vị trí quán ăn.", status: 400 },
};

/** Thông báo lỗi FIELDS_BLOCKED kèm tên field bị chặn. */
export function describeBlockedFields(fields: SubmissionField[]): string {
  const labels = fields.map((field) => SUBMISSION_FIELD_LABELS[field]).join(", ");
  return `${WORKFLOW_ERRORS.FIELDS_BLOCKED.message} Bị chặn: ${labels}.`;
}

type Result<T = object> = ({ error: null } & T) | { error: WorkflowError; blockedFields?: SubmissionField[] };

const fail = (error: WorkflowError) => ({ error }) as const;

const DECISION_TO_ACTION: Record<ModerationDecision, string> = {
  approved: "approve_food",
  rejected: "reject_food",
  needs_revision: "needs_revision",
};

/** Shape tối thiểu của Food sau `.lean()` — model khai báo `models.Food ?? model(...)` nên TS không tự suy ra. */
interface LeanSubmission {
  _id: unknown;
  name: string;
  createdBy: unknown;
  restaurantId?: unknown;
  moderationStatus: string;
  reviewerId?: unknown;
  claimedAt?: Date;
  categoryIds?: unknown[];
  proposedCategoryId?: unknown;
  images?: string[];
  editCount?: number;
}

const UNSET_CLAIM = { reviewerId: "", claimedAt: "" };

/* ------------------------------------------------------------------ */
/* Reviewer: nhận / nhả                                                  */
/* ------------------------------------------------------------------ */

/** PENDING → IN_REVIEW. Đề xuất `in_review` đã quá hạn cũng nhận lại được (coi như đã nhả). */
export async function claimSubmission(
  reviewerId: string,
  foodId: string,
  now: Date = new Date(),
): Promise<Result<{ claimedAt: Date }>> {
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  await connectDB();

  const claimed = (await Food.findOneAndUpdate(
    {
      _id: foodId,
      visibility: { $ne: "deleted" },
      createdBy: { $ne: reviewerId },
      $or: [{ moderationStatus: "pending" }, { moderationStatus: "in_review", claimedAt: { $lt: claimCutoff(now) } }],
    },
    { $set: { moderationStatus: "in_review", reviewerId, claimedAt: now, updatedAt: now } },
    { new: true },
  ).lean()) as LeanSubmission | null;

  if (!claimed) {
    const existing = (await Food.findById(foodId).select("createdBy visibility").lean()) as LeanSubmission | null;
    if (!existing) return fail("NOT_FOUND");
    if (String(existing.createdBy) === reviewerId) return fail("SELF_SUBMITTED");
    return fail("ALREADY_TAKEN");
  }

  await AuditLog.create({ actorId: reviewerId, action: "claim_submission", targetType: "food", targetId: foodId, metadata: { name: claimed.name } });
  await notify(String(claimed.createdBy), {
    type: "submission_claimed",
    payload: { targetType: "food", targetId: foodId, name: claimed.name },
    actorId: reviewerId,
    email: false,
  });
  return { error: null, claimedAt: now };
}

/** IN_REVIEW → PENDING do chính reviewer đang giữ nhả ra (đã quá hạn thì cũng coi như nhả được). */
export async function releaseSubmission(reviewerId: string, foodId: string, now: Date = new Date()): Promise<Result> {
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  await connectDB();

  const released = (await Food.findOneAndUpdate(
    { _id: foodId, moderationStatus: { $in: sourceStatuses("pending", "reviewer") }, reviewerId },
    { $set: { moderationStatus: "pending", updatedAt: now }, $unset: UNSET_CLAIM },
    { new: true },
  ).lean()) as LeanSubmission | null;
  if (!released) {
    const exists = await Food.exists({ _id: foodId });
    return fail(exists ? "NOT_HOLDER" : "NOT_FOUND");
  }

  await AuditLog.create({ actorId: reviewerId, action: "release_submission", targetType: "food", targetId: foodId, metadata: { name: released.name } });
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Reviewer / Admin: quyết định                                          */
/* ------------------------------------------------------------------ */

interface DecideInput {
  actorId: string;
  /** reviewer: phải đang giữ đề xuất. admin: quyết định thẳng từ pending/in_review (override). */
  actorRole: "reviewer" | "admin";
  foodId: string;
  decision: ModerationDecision;
  note: string;
  now?: Date;
}

/** IN_REVIEW (hoặc PENDING với Admin) → APPROVED / REJECTED / NEEDS_CHANGES. BR-F04→F09. */
export async function decideSubmission({ actorId, actorRole, foodId, decision, note, now = new Date() }: DecideInput): Promise<Result> {
  const reason = note.trim();
  if (decision !== "approved" && !reason) return fail("REASON_REQUIRED"); // BR-F06 / BR-F07
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  await connectDB();

  const filter =
    actorRole === "reviewer"
      ? { _id: foodId, moderationStatus: "in_review", reviewerId: actorId, claimedAt: { $gte: claimCutoff(now) } }
      : {
          _id: foodId,
          visibility: { $ne: "deleted" },
          createdBy: { $ne: actorId }, // BR-F02: Admin cũng không tự duyệt món của mình
          moderationStatus: { $in: sourceStatuses(decision, "admin") },
        };
  const update =
    decision === "approved"
      ? {
          $set: { moderationStatus: decision, verification: { verifiedBy: actorId, verifiedAt: now, note: reason || undefined }, updatedAt: now },
          $unset: { ...UNSET_CLAIM, moderationNote: "" },
        }
      : { $set: { moderationStatus: decision, moderationNote: reason, updatedAt: now }, $unset: UNSET_CLAIM };

  // Lấy bản TRƯỚC khi cập nhật để biết reviewer nào đang giữ (thông báo khi Admin override).
  const before = (await Food.findOneAndUpdate(filter, update, { new: false }).lean()) as LeanSubmission | null;
  if (!before) return fail(await diagnoseDecisionFailure(actorId, actorRole, foodId, now));

  if (decision === "approved" && before.proposedCategoryId && (before.categoryIds ?? []).length === 0) {
    // Đề xuất danh mục chưa xử lý mà món không còn danh mục nào → tạm vào "Khác" (lib/categoryProposals.ts).
    const proposal = (await CategoryProposal.findById(before.proposedCategoryId).select("status").lean()) as { status?: string } | null;
    if (proposal?.status === "pending") {
      await Food.updateOne({ _id: foodId }, { $set: { categoryIds: [await getFallbackCategoryId()] } });
    }
  }
  await recountCategoriesOfFood(foodId);

  await AuditLog.create({
    actorId,
    action: DECISION_TO_ACTION[decision],
    targetType: "food",
    targetId: foodId,
    reason: reason || undefined,
    metadata: { name: before.name },
  });

  if (decision !== "needs_revision") {
    await cascadeRestaurant({ restaurantId: before.restaurantId, foodId, outcome: decision, actorId, reason, now });
  }

  const previousReviewerId = before.moderationStatus === "in_review" && before.reviewerId ? String(before.reviewerId) : null;
  if (actorRole === "admin" && previousReviewerId && previousReviewerId !== actorId) {
    await AuditLog.create({
      actorId,
      action: "admin_override_decision",
      targetType: "food",
      targetId: foodId,
      reason: reason || undefined,
      metadata: { name: before.name, decision, previousReviewerId },
    });
    await notify(previousReviewerId, {
      type: "submission_overridden",
      payload: { targetType: "food", targetId: foodId, name: before.name, decision },
      actorId,
      email: false,
    });
  }

  const ownerId = String(before.createdBy);
  const target = { targetType: "food" as const, targetId: foodId, name: before.name };
  if (decision === "approved") {
    await notify(ownerId, { type: "food_approved", payload: target, actorId });
    // Trao thành tựu ngay khi duyệt; lỗi ở bước phụ này không được làm hỏng quyết định đã ghi.
    await getContributionOverview(ownerId).catch(() => undefined);
  } else if (decision === "rejected") {
    await notify(ownerId, { type: "food_rejected", payload: { ...target, reason }, actorId });
  } else {
    await notify(ownerId, { type: "food_needs_revision", payload: { ...target, feedback: reason }, actorId });
  }
  return { error: null };
}

async function diagnoseDecisionFailure(
  actorId: string,
  actorRole: "reviewer" | "admin",
  foodId: string,
  now: Date,
): Promise<WorkflowError> {
  const food = (await Food.findById(foodId).select("createdBy moderationStatus reviewerId claimedAt").lean()) as LeanSubmission | null;
  if (!food) return "NOT_FOUND";
  if (String(food.createdBy) === actorId) return "SELF_SUBMITTED";
  if (actorRole === "admin") return "INVALID_TRANSITION";
  if (food.moderationStatus === "in_review" && String(food.reviewerId) === actorId && isClaimExpired(food.claimedAt, now)) {
    return "CLAIM_EXPIRED";
  }
  return "NOT_HOLDER";
}

/**
 * Quán mới đi kèm (BR-C07) theo kết quả của món. Hiện tại quán `pending` chỉ có đúng 1 món tham
 * chiếu (chọn quán có sẵn chỉ nhận quán approved), nhưng DB không ràng buộc nên vẫn kiểm tra:
 *  - approved: duyệt quán luôn — món đã duyệt phải thuộc quán hợp lệ (BR-C02).
 *  - rejected / withdrawn: chỉ đổi quán khi không còn món nào khác đang dùng (chưa bị từ chối/rút).
 * Quán `needs_revision` chỉ còn ở dữ liệu cũ — xử lý như `pending`.
 */
async function cascadeRestaurant({
  restaurantId,
  foodId,
  outcome,
  actorId,
  reason,
  now,
}: {
  restaurantId: unknown;
  foodId: string;
  outcome: "approved" | "rejected" | "withdrawn";
  actorId: string;
  reason: string;
  now: Date;
}): Promise<void> {
  if (!restaurantId) return;
  const openStatuses = ["pending", "needs_revision"];
  if (outcome !== "approved") {
    const stillUsed = await Food.exists({
      _id: { $ne: foodId },
      restaurantId,
      visibility: { $ne: "deleted" },
      moderationStatus: { $nin: ["rejected", "withdrawn"] },
    });
    if (stillUsed) return;
  }

  const set: Record<string, unknown> = { moderationStatus: outcome, updatedAt: now };
  const unset: Record<string, ""> = {};
  if (outcome === "approved") {
    set.verification = { verifiedBy: actorId, verifiedAt: now, note: reason || undefined };
    unset.moderationNote = "";
  } else if (outcome === "rejected") {
    set.moderationNote = reason;
  }
  const restaurant = (await Restaurant.findOneAndUpdate(
    { _id: restaurantId, moderationStatus: { $in: openStatuses } },
    { $set: set, ...(Object.keys(unset).length > 0 && { $unset: unset }) },
    { new: true },
  ).lean()) as { name: string } | null;
  if (!restaurant || outcome === "withdrawn") return;

  await AuditLog.create({
    actorId,
    action: DECISION_TO_ACTION[outcome],
    targetType: "restaurant",
    targetId: restaurantId,
    reason: reason || undefined,
    metadata: { name: restaurant.name, viaFoodId: foodId },
  });
}

/**
 * Quán `pending` KHÔNG còn đi kèm đề xuất món nào đang mở — chỉ còn ở dữ liệu cũ (vd. món đã duyệt
 * nhưng quán từng bị yêu cầu sửa rồi gửi lại). Giữ luồng quyết định trực tiếp như trước, không cần nhận.
 */
export async function decideStandaloneRestaurant({
  actorId,
  restaurantId,
  decision,
  note,
  now = new Date(),
}: {
  actorId: string;
  restaurantId: string;
  decision: ModerationDecision;
  note: string;
  now?: Date;
}): Promise<Result> {
  const reason = note.trim();
  if (decision !== "approved" && !reason) return fail("REASON_REQUIRED");
  if (!isValidObjectId(restaurantId)) return fail("INVALID_ID");
  await connectDB();

  const linked = await Food.exists({
    restaurantId,
    visibility: { $ne: "deleted" },
    moderationStatus: { $in: ACTIVE_SUBMISSION_STATUSES },
  });
  if (linked) return fail("PART_OF_SUBMISSION");

  const update =
    decision === "approved"
      ? {
          $set: { moderationStatus: decision, verification: { verifiedBy: actorId, verifiedAt: now, note: reason || undefined }, updatedAt: now },
          $unset: { moderationNote: "" },
        }
      : { $set: { moderationStatus: decision, moderationNote: reason, updatedAt: now } };
  const restaurant = (await Restaurant.findOneAndUpdate(
    { _id: restaurantId, moderationStatus: "pending", createdBy: { $ne: actorId } },
    update,
    { new: true },
  ).lean()) as { name: string; createdBy: unknown } | null;
  if (!restaurant) {
    const existing = (await Restaurant.findById(restaurantId).select("createdBy").lean()) as { createdBy: unknown } | null;
    if (!existing) return fail("NOT_FOUND");
    return fail(String(existing.createdBy) === actorId ? "SELF_SUBMITTED" : "INVALID_TRANSITION");
  }

  await AuditLog.create({
    actorId,
    action: DECISION_TO_ACTION[decision],
    targetType: "restaurant",
    targetId: restaurantId,
    reason: reason || undefined,
    metadata: { name: restaurant.name },
  });

  const ownFood = (await Food.findOne({ restaurantId, createdBy: restaurant.createdBy }).select("_id").lean()) as { _id: unknown } | null;
  const target = {
    targetType: "restaurant" as const,
    targetId: restaurantId,
    name: restaurant.name,
    ...(ownFood && { foodId: String(ownFood._id) }),
  };
  const ownerId = String(restaurant.createdBy);
  if (decision === "approved") {
    await notify(ownerId, { type: "food_approved", payload: target, actorId });
    await getContributionOverview(ownerId).catch(() => undefined);
  } else if (decision === "rejected") {
    await notify(ownerId, { type: "food_rejected", payload: { ...target, reason }, actorId });
  } else {
    await notify(ownerId, { type: "food_needs_revision", payload: { ...target, feedback: reason }, actorId });
  }
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Chủ đề xuất: rút / ghi chú đính chính                                */
/* ------------------------------------------------------------------ */

/** PENDING / IN_REVIEW / NEEDS_CHANGES → WITHDRAWN. Đang có reviewer giữ thì báo cho người đó. */
export async function withdrawSubmission(userId: string, foodId: string, now: Date = new Date()): Promise<Result> {
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  await connectDB();

  const before = (await Food.findOneAndUpdate(
    {
      _id: foodId,
      createdBy: userId,
      visibility: { $ne: "deleted" },
      moderationStatus: { $in: sourceStatuses("withdrawn", "owner") },
    },
    { $set: { moderationStatus: "withdrawn", updatedAt: now }, $unset: UNSET_CLAIM },
    { new: false },
  ).lean()) as LeanSubmission | null;
  if (!before) {
    const exists = await Food.exists({ _id: foodId, createdBy: userId, visibility: { $ne: "deleted" } });
    return fail(exists ? "INVALID_TRANSITION" : "NOT_FOUND");
  }

  await cascadeRestaurant({ restaurantId: before.restaurantId, foodId, outcome: "withdrawn", actorId: userId, reason: "", now });
  await AuditLog.create({
    actorId: userId,
    action: "withdraw_submission",
    targetType: "food",
    targetId: foodId,
    metadata: { name: before.name, fromStatus: before.moderationStatus },
  });

  if (before.moderationStatus === "in_review" && before.reviewerId && !isClaimExpired(before.claimedAt, now)) {
    await notify(String(before.reviewerId), {
      type: "submission_withdrawn",
      payload: { targetType: "food", targetId: foodId, name: before.name },
      actorId: userId,
      email: false,
    });
  }
  return { error: null };
}

const NOTES_PER_HOUR = 10;

export interface SubmissionNoteView {
  id: string;
  content: string;
  createdAt: string;
}

/** User gửi ghi chú đính chính khi đề xuất đang IN_REVIEW — không đổi trạng thái. */
export async function addSubmissionNote(
  userId: string,
  foodId: string,
  rawContent: string,
  now: Date = new Date(),
): Promise<Result<{ note: SubmissionNoteView }>> {
  const content = rawContent.trim();
  if (!content || content.length > SUBMISSION_NOTE_MAX_LENGTH) return fail("INVALID_NOTE");
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  await connectDB();

  const food = (await Food.findOne({ _id: foodId, createdBy: userId, visibility: { $ne: "deleted" } })
    .select("name moderationStatus reviewerId claimedAt")
    .lean()) as LeanSubmission | null;
  if (!food) return fail("NOT_FOUND");
  if (food.moderationStatus !== "in_review" || !food.reviewerId || isClaimExpired(food.claimedAt, now)) return fail("NOT_IN_REVIEW");

  const limit = await hitRateLimit(`submission:note:user:${userId}`, NOTES_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) return fail("RATE_LIMITED");

  const note = await SubmissionNote.create({ submissionId: foodId, authorId: userId, content, createdAt: now });
  await notify(String(food.reviewerId), {
    type: "submission_note_added",
    payload: { targetType: "food", targetId: foodId, name: food.name, excerpt: content.slice(0, 140) },
    actorId: userId,
    email: false,
  });
  return { error: null, note: { id: String(note._id), content, createdAt: now.toISOString() } };
}

/* ------------------------------------------------------------------ */
/* Chủ đề xuất: sửa (PENDING) / sửa & gửi lại (NEEDS_CHANGES → PENDING)  */
/* ------------------------------------------------------------------ */

export interface SubmissionEditInput {
  /** Field có mặt trong request (để báo đúng field bị chặn); bỏ trống thì suy theo nhóm food/restaurant. */
  requestedFields?: SubmissionField[];
  food?: {
    name: string;
    description: string;
    priceMin: number;
    priceMax: number;
    categoryIds: string[];
    eatingLevels: string[];
    /** URL ảnh cũ user giữ lại — phải nằm trong `food.images` hiện có. */
    keepImages: string[];
    newImages: File[];
  };
  /** Sửa tên / địa chỉ / vị trí của quán mới do chính user tạo (quán còn pending). */
  restaurant?: {
    name: string;
    address: string;
    location: { lat: number; lng: number } | null;
    locationSource: LocationSource;
  };
  /** Đổi món sang 1 quán có sẵn khác (approved, đang hiển thị, chưa đóng cửa). */
  restaurantSwitch?: { restaurantId: string };
}

/**
 * Báo cho Reviewer đã yêu cầu sửa (actor của AuditLog needs_revision gần nhất).
 * Không tìm được hoặc người đó không còn quyền kiểm duyệt → bỏ qua; mục vẫn nằm trong hàng chờ.
 */
async function notifyRevisionRequester(foodId: string, name: string, contributorId: string) {
  const log = (await AuditLog.findOne({ action: "needs_revision", targetType: "food", targetId: foodId })
    .sort({ createdAt: -1 })
    .select("actorId")
    .lean()) as { actorId?: unknown } | null;
  if (!log?.actorId) return;
  const reviewer = (await User.findOne({ _id: log.actorId, role: { $in: ["foodreviewer", "admin"] }, accountStatus: { $ne: "banned" } })
    .select("_id")
    .lean()) as { _id: unknown } | null;
  if (!reviewer) return;
  await notify(String(reviewer._id), {
    type: "contribution_resubmitted",
    payload: { targetType: "food", targetId: foodId, name },
    actorId: contributorId,
  });
}

/**
 * - PENDING: sửa cả 2 nhóm, mỗi lần +1 `editCount` (tối đa MAX_PENDING_EDITS), giữ `pending`. Nhóm nặng =
 *   đổi sang quán có sẵn khác, hoặc sửa quán mới do chính user tạo (còn pending). Đổi khỏi quán mới thì
 *   quán đó đi theo cascade "withdrawn" (chỉ khi không còn món nào khác dùng).
 * - NEEDS_CHANGES: chỉ nhóm nhẹ, lưu là gửi lại → `pending`, reset `editCount`.
 * - Trạng thái khác: chặn, trả danh sách field bị chặn.
 * Update cuối cùng có điều kiện trạng thái, nên reviewer vừa nhận xác minh thì bản sửa không lọt.
 */
export async function editSubmission(
  userId: string,
  foodId: string,
  input: SubmissionEditInput,
  now: Date = new Date(),
): Promise<Result<{ status: string; remainingEdits: number | null }>> {
  if (!isValidObjectId(foodId)) return fail("INVALID_ID");
  if (!input.food && !input.restaurant && !input.restaurantSwitch) return fail("NOTHING_TO_UPDATE");
  // Đổi quán và sửa chi tiết quán cũ trong cùng 1 lần là mâu thuẫn.
  if (input.restaurant && input.restaurantSwitch) return fail("INVALID_RESTAURANT");
  await connectDB();
  await releaseExpiredClaims(now);

  const food = (await Food.findOne({ _id: foodId, createdBy: userId, visibility: { $ne: "deleted" } }).lean()) as LeanSubmission | null;
  if (!food) return fail("NOT_FOUND");

  const status = food.moderationStatus;
  const fields: SubmissionField[] =
    input.requestedFields ??
    [...(input.food ? LIGHT_FIELDS : []), ...(input.restaurant || input.restaurantSwitch ? HEAVY_FIELDS : [])];
  const blockedFields = findBlockedFields(status, fields);
  if (blockedFields.length > 0) return { error: "FIELDS_BLOCKED", blockedFields };
  const editCount = food.editCount ?? 0;
  if (status === "pending" && editCount >= MAX_PENDING_EDITS) return fail("EDIT_LIMIT");

  if (input.restaurant) {
    // Chỉ quán mới do chính user tạo kèm (còn chờ duyệt) mới sửa được; quán có sẵn trong hệ thống thì không.
    const restaurant = (await Restaurant.findById(food.restaurantId).select("createdBy moderationStatus").lean()) as {
      createdBy: unknown;
      moderationStatus: string;
    } | null;
    if (!restaurant || String(restaurant.createdBy) !== userId || restaurant.moderationStatus !== "pending") {
      return fail("RESTAURANT_LOCKED");
    }
    const { name, address, location } = input.restaurant;
    const isValidCoordinate =
      !location ||
      (Number.isFinite(location.lat) && Number.isFinite(location.lng) && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180);
    if (!name.trim() || !address.trim() || !isValidCoordinate) return fail("INVALID_RESTAURANT");
  }

  const foodSet: Record<string, unknown> = { updatedAt: now };
  const previousRestaurantId = food.restaurantId;
  if (input.restaurantSwitch) {
    const targetId = input.restaurantSwitch.restaurantId;
    if (!isValidObjectId(targetId) || String(targetId) === String(previousRestaurantId)) return fail("INVALID_RESTAURANT");
    // Cùng điều kiện "quán có sẵn" như lúc tạo món (lib/foodSubmission.ts).
    const target = await Restaurant.exists({
      _id: targetId,
      moderationStatus: "approved",
      visibility: "visible",
      businessStatus: { $ne: "closed" },
    });
    if (!target) return fail("INVALID_RESTAURANT");
    foodSet.restaurantId = targetId;
  }

  let uploadedUrls: string[] = [];
  if (input.food) {
    const { name, description, priceMin, priceMax, categoryIds, eatingLevels, keepImages, newImages } = input.food;
    if (!name.trim()) return fail("INVALID_FOOD");
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < priceMin) return fail("INVALID_PRICE");
    if (eatingLevels.length === 0 || eatingLevels.some((level) => !isEatingLevel(level))) return fail("INVALID_EATING_LEVEL");
    // Luật danh mục chung với lúc tạo món (lib/foodSubmission.ts); "Khác" chỉ giữ lại được nếu món đang ở đó sẵn.
    const fallbackId = await getFallbackCategoryId();
    const hadFallback = (food.categoryIds ?? []).map(String).includes(fallbackId);
    const categoryError = await validateFoodCategories(categoryIds, food.proposedCategoryId ? 1 : 0, hadFallback);
    if (categoryError) return fail(categoryError);

    const currentImages = new Set<string>(food.images ?? []);
    const keptImages = keepImages.filter((url) => currentImages.has(url));
    const isValidUpload = (file: File) => file.type.startsWith("image/") && file.size > 0 && file.size <= MAX_FOOD_IMAGE_BYTES;
    const totalImages = keptImages.length + newImages.length;
    if (totalImages < 1 || totalImages > MAX_FOOD_IMAGES || !newImages.every(isValidUpload)) return fail("INVALID_IMAGES");

    uploadedUrls = await Promise.all(newImages.map((file) => uploadImageFile(file, "nayangi/foods")));
    Object.assign(foodSet, {
      name: name.trim(),
      description: description.trim(),
      priceRange: { min: priceMin, max: priceMax },
      categoryIds: [...new Set(categoryIds)],
      eatingLevels,
      images: [...keptImages, ...uploadedUrls],
    });
  }

  const isResubmit = status === "needs_revision";
  const updated = (await Food.findOneAndUpdate(
    isResubmit
      ? { _id: foodId, createdBy: userId, moderationStatus: "needs_revision" }
      : { _id: foodId, createdBy: userId, moderationStatus: "pending", editCount: { $lt: MAX_PENDING_EDITS } },
    isResubmit
      ? { $set: { ...foodSet, moderationStatus: "pending", editCount: 0 }, $unset: { moderationNote: "" } }
      : { $set: foodSet, $inc: { editCount: 1 } },
    { new: true },
  ).lean()) as LeanSubmission | null;

  if (!updated) {
    // Thua cuộc đua (vừa bị nhận xác minh / hết lượt sửa): ảnh mới tải lên thành rác → gắn tag để cron dọn.
    const publicIds = uploadedUrls.map((url) => parseOwnUploadUrl(url, "food")).filter((id): id is string => Boolean(id));
    await markImagesUnattached(publicIds);
    return fail("STATUS_CHANGED");
  }

  if (input.restaurant) {
    const { name, address, location, locationSource } = input.restaurant;
    // findOneAndUpdate không chạy hook pre("validate") của Restaurant → tự tính field chuẩn hoá.
    await Restaurant.updateOne(
      { _id: food.restaurantId, createdBy: userId, moderationStatus: "pending" },
      {
        $set: {
          name: name.trim(),
          address: address.trim(),
          nameNormalized: normalizeVietnamese(name.trim()),
          addressNormalized: normalizeVietnamese(address.trim()),
          ...(location && { location: { type: "Point", coordinates: [location.lng, location.lat] } }),
          locationSource: location ? (locationSource === "none" ? "pin_confirmed" : locationSource) : "none",
          updatedAt: now,
        },
        $unset: { moderationNote: "", ...(!location && { location: "" }) },
      },
    );
  }

  if (input.restaurantSwitch) {
    // Quán cũ là quán mới user tạo kèm → bỏ (withdrawn) nếu không còn món nào khác dùng; quán approved thì không đổi.
    await cascadeRestaurant({ restaurantId: previousRestaurantId, foodId, outcome: "withdrawn", actorId: userId, reason: "", now });
  }

  if (isResubmit) await notifyRevisionRequester(foodId, updated.name, userId);
  return { error: null, status: updated.moderationStatus, remainingEdits: remainingEdits(updated.moderationStatus, updated.editCount ?? 0) };
}

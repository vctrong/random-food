import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Report } from "@/lib/models/Report";
import { ReportCase } from "@/lib/models/ReportCase";
import { Review } from "@/lib/models/Review";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Experience } from "@/lib/models/Experience";
import { User } from "@/lib/models/User";
import { AuditLog } from "@/lib/models/AuditLog";
import { notify, notifyMany } from "@/lib/notifications/notify";
import type { NotificationPayloadMap } from "@/types/notification";
import { recalculateFoodRating } from "@/lib/reviews";
import { recountCategoryFoods } from "@/lib/categoryCounts";
import { editFood, editRestaurant, type FoodEdit, type RestaurantEdit } from "@/lib/contentEdits";
import type { ReportCaseAction, ReportCaseStatus, ReportReason, ReportTargetType } from "@/constants/reports";
import type {
  AccountStatus,
  AdminReportCaseAuthor,
  AdminReportCaseDetail,
  AdminReportCaseRow,
  AdminReportCaseTarget,
  AdminReportEntry,
} from "@/types/admin";
import type { LocationSource, OpeningSchedule } from "@/types/restaurant";
import { resolveOpeningSchedule } from "@/features/opening-hours/openingHours";

/**
 * Xử lý case báo cáo — CHỈ Admin (BR-A09, BR-M10→M14). Route gọi phải kiểm
 * requireAdminSession trước; lib không tự kiểm quyền.
 */

interface LeanCase {
  _id: unknown;
  targetType: ReportTargetType;
  targetId: unknown;
  reportCount: number;
  reasonCounts?: Record<string, number> | Map<string, number>;
  status: ReportCaseStatus;
  action?: ReportCaseAction;
  resolutionNote?: string;
  resolvedBy?: { _id?: unknown; name?: string } | null;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

function toReasonCounts(value: LeanCase["reasonCounts"]): { reason: ReportReason; count: number }[] {
  const entries = value instanceof Map ? [...value.entries()] : Object.entries(value ?? {});
  return entries
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({ reason: reason as ReportReason, count }))
    .sort((a, b) => b.count - a.count);
}

async function loadLabels(cases: LeanCase[]): Promise<Map<string, string>> {
  const idsOf = (type: ReportTargetType) => cases.filter((item) => item.targetType === type).map((item) => item.targetId);
  const [reviews, foods, restaurants] = await Promise.all([
    Review.find({ _id: { $in: idsOf("review") } }).select("comment rating").lean(),
    Food.find({ _id: { $in: idsOf("food") } }).select("name").lean(),
    Restaurant.find({ _id: { $in: idsOf("restaurant") } }).select("name").lean(),
  ]);
  const labels = new Map<string, string>();
  for (const review of reviews as unknown as { _id: unknown; comment?: string; rating: number }[]) {
    labels.set(String(review._id), review.comment?.trim() || `Đánh giá ${review.rating}★ không có bình luận`);
  }
  for (const doc of [...foods, ...restaurants] as unknown as { _id: unknown; name: string }[]) labels.set(String(doc._id), doc.name);
  return labels;
}

function toRow(item: LeanCase, labels: Map<string, string>): AdminReportCaseRow {
  return {
    id: String(item._id),
    targetType: item.targetType,
    targetId: String(item.targetId),
    targetLabel: labels.get(String(item.targetId)) ?? null,
    reportCount: item.reportCount,
    reasonCounts: toReasonCounts(item.reasonCounts),
    status: item.status,
    action: item.action ?? null,
    resolutionNote: item.resolutionNote ?? null,
    resolvedBy: item.resolvedBy?._id ? { id: String(item.resolvedBy._id), name: item.resolvedBy.name ?? "" } : null,
    resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).toISOString() : null,
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(item.updatedAt ?? item.createdAt ?? Date.now()).toISOString(),
  };
}

export async function listReportCases({
  status,
  targetType,
}: {
  status?: ReportCaseStatus;
  targetType?: ReportTargetType;
} = {}): Promise<AdminReportCaseRow[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;
  // Case nhiều lượt báo cáo lên trước, cùng số lượt thì case mới cập nhật lên trước.
  const cases = (await ReportCase.find(filter)
    .sort({ reportCount: -1, updatedAt: -1 })
    .limit(300)
    .populate("resolvedBy", "name")
    .lean()) as unknown as LeanCase[];
  const labels = await loadLabels(cases);
  return cases.map((item) => toRow(item, labels));
}

export async function countPendingReportCases(): Promise<number> {
  await connectDB();
  return ReportCase.countDocuments({ status: "pending" });
}

async function loadAuthor(userId: unknown): Promise<AdminReportCaseAuthor | null> {
  if (!userId) return null;
  const user = (await User.findById(userId).select("name warningCount accountStatus").lean()) as {
    _id: unknown;
    name?: string;
    warningCount?: number;
    accountStatus?: AccountStatus;
  } | null;
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name ?? "Người dùng",
    warningCount: user.warningCount ?? 0,
    accountStatus: user.accountStatus ?? "active",
  };
}

async function loadTarget(targetType: ReportTargetType, targetId: unknown): Promise<AdminReportCaseTarget | null> {
  if (targetType === "review") {
    const review = (await Review.findById(targetId).populate("foodId", "name").lean()) as {
      _id: unknown;
      rating: number;
      comment?: string;
      status: "visible" | "hidden" | "hidden_pending_review";
      userId: unknown;
      foodId?: { _id: unknown; name: string } | null;
    } | null;
    if (!review) return null;
    return {
      type: "review",
      id: String(review._id),
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status,
      food: review.foodId ? { id: String(review.foodId._id), name: review.foodId.name } : null,
      author: await loadAuthor(review.userId),
    };
  }
  if (targetType === "food") {
    const food = (await Food.findById(targetId).populate("restaurantId", "name").lean()) as {
      _id: unknown;
      name: string;
      description?: string;
      images?: string[];
      priceRange?: { min?: number; max?: number };
      restaurantId?: { _id: unknown; name: string } | null;
      createdBy?: unknown;
    } | null;
    if (!food) return null;
    return {
      type: "food",
      id: String(food._id),
      name: food.name,
      description: food.description ?? "",
      images: food.images ?? [],
      priceMin: food.priceRange?.min ?? null,
      priceMax: food.priceRange?.max ?? null,
      restaurant: food.restaurantId ? { id: String(food.restaurantId._id), name: food.restaurantId.name } : null,
      author: await loadAuthor(food.createdBy),
    };
  }
  const restaurant = (await Restaurant.findById(targetId).lean()) as {
    _id: unknown;
    name: string;
    address: string;
    location?: { coordinates?: [number, number] };
    locationSource?: LocationSource;
    openingHours?: string;
    openingSchedule?: OpeningSchedule;
    images?: string[];
    businessStatus?: "open" | "closed";
    createdBy?: unknown;
  } | null;
  if (!restaurant) return null;
  const coordinates = restaurant.location?.coordinates;
  return {
    type: "restaurant",
    id: String(restaurant._id),
    name: restaurant.name,
    address: restaurant.address,
    location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
    locationSource: restaurant.locationSource ?? null,
    openingSchedule: resolveOpeningSchedule(restaurant.openingSchedule, restaurant.openingHours),
    images: restaurant.images ?? [],
    businessStatus: restaurant.businessStatus ?? "open",
    foodCount: await Food.countDocuments({ restaurantId: restaurant._id, visibility: { $ne: "deleted" } }),
    author: await loadAuthor(restaurant.createdBy),
  };
}

export async function getReportCaseDetail(caseId: string): Promise<AdminReportCaseDetail | null> {
  if (!isValidObjectId(caseId)) return null;
  await connectDB();
  const item = (await ReportCase.findById(caseId).populate("resolvedBy", "name").lean()) as unknown as LeanCase | null;
  if (!item) return null;

  const [labels, reports, target] = await Promise.all([
    loadLabels([item]),
    Report.find({ caseId: item._id })
      .sort({ createdAt: -1 })
      .populate("reporterId", "name")
      .populate("duplicateOfRestaurantId", "name address")
      .lean(),
    loadTarget(item.targetType, item.targetId),
  ]);

  const entries: AdminReportEntry[] = (reports as unknown as {
    _id: unknown;
    reason: ReportReason;
    note?: string;
    reporterId?: { _id: unknown; name?: string } | null;
    duplicateOfRestaurantId?: { _id: unknown; name: string; address: string } | null;
    createdAt: Date;
  }[]).map((report) => ({
    id: String(report._id),
    reason: report.reason,
    note: report.note ?? null,
    reporter: { id: String(report.reporterId?._id ?? ""), name: report.reporterId?.name ?? "Người dùng đã xoá" },
    duplicateOf: report.duplicateOfRestaurantId
      ? {
          id: String(report.duplicateOfRestaurantId._id),
          name: report.duplicateOfRestaurantId.name,
          address: report.duplicateOfRestaurantId.address,
        }
      : null,
    createdAt: new Date(report.createdAt).toISOString(),
  }));

  return { ...toRow(item, labels), reports: entries, target };
}

// ---------------------------------------------------------------- Xử lý case

export type ResolveCaseInput =
  | { action: "dismiss"; note: string }
  | { action: "remove_review" | "remove_review_warn"; note: string }
  | { action: "edit_info"; note: string; food?: FoodEdit; restaurant?: RestaurantEdit }
  | { action: "mark_closed"; note: string }
  | { action: "merge_restaurant"; note: string; mergeIntoRestaurantId: string; confirm: true };

export type ResolveCaseError =
  | "NOT_FOUND"
  | "NOT_PENDING"
  | "NOTE_REQUIRED"
  | "ACTION_NOT_ALLOWED"
  | "TARGET_MISSING"
  | "INVALID_EDIT"
  | "INVALID_MERGE_TARGET";

const ACTIONS_BY_TARGET: Record<ReportTargetType, ReportCaseAction[]> = {
  review: ["dismiss", "remove_review", "remove_review_warn"],
  food: ["dismiss", "edit_info"],
  restaurant: ["dismiss", "edit_info", "mark_closed", "merge_restaurant"],
};

type ReportOutcome = Omit<NotificationPayloadMap["report_handled"], "caseId" | "targetType">;

async function notifyReporters(caseId: unknown, targetType: ReportTargetType, outcome: ReportOutcome, adminId: string) {
  const reporterIds = (await Report.distinct("reporterId", { caseId })) as unknown[];
  await notifyMany(reporterIds.map(String), {
    type: "report_handled",
    payload: { caseId: String(caseId), targetType, ...outcome },
    actorId: adminId,
  });
}

/** Gộp quán trùng vào quán gốc: chuyển món + lịch sử check-in + đánh giá; quán trùng thành "deleted". Không hoàn tác được. */
async function mergeRestaurants(duplicateId: string, targetId: string): Promise<number> {
  const duplicate = new Types.ObjectId(duplicateId);
  const target = new Types.ObjectId(targetId);
  const foods = (await Food.find({ restaurantId: duplicate }).select("categoryIds").lean()) as unknown as { categoryIds?: unknown[] }[];
  await Food.updateMany({ restaurantId: duplicate }, { $set: { restaurantId: target, updatedAt: new Date() } });
  await Experience.updateMany({ restaurantId: duplicate }, { $set: { restaurantId: target } });
  await Review.updateMany({ restaurantId: duplicate }, { $set: { restaurantId: target } });
  await Restaurant.updateOne(
    { _id: duplicate },
    { $set: { visibility: "deleted", mergedIntoRestaurantId: target, updatedAt: new Date() } },
  );
  // Quán không lưu số liệu denormalized; foodCount của danh mục đếm theo món nên không đổi — vẫn đếm lại cho chắc.
  await recountCategoryFoods(foods.flatMap((food) => food.categoryIds ?? []));
  return foods.length;
}

export async function resolveReportCase(
  adminId: string,
  caseId: string,
  input: ResolveCaseInput,
): Promise<{ error: ResolveCaseError | null }> {
  if (!isValidObjectId(caseId)) return { error: "NOT_FOUND" };
  const note = input.note.trim();
  if (!note) return { error: "NOTE_REQUIRED" };

  await connectDB();
  const reportCase = await ReportCase.findById(caseId);
  if (!reportCase) return { error: "NOT_FOUND" };
  if (reportCase.status !== "pending") return { error: "NOT_PENDING" };
  const targetType = reportCase.targetType as ReportTargetType;
  const targetId = String(reportCase.targetId);
  if (!ACTIONS_BY_TARGET[targetType].includes(input.action)) return { error: "ACTION_NOT_ALLOWED" };

  let reporterOutcome: ReportOutcome;
  const audit: Record<string, unknown> = {};

  if (input.action === "dismiss") {
    if (targetType === "review") {
      const review = (await Review.findOneAndUpdate(
        { _id: targetId, status: "hidden_pending_review" },
        { $set: { status: "visible", updatedAt: new Date() } },
      )
        .select("foodId")
        .lean()) as { foodId?: unknown } | null;
      if (review?.foodId) await recalculateFoodRating(String(review.foodId));
    }
    reporterOutcome = { outcome: "dismissed" };
  } else if (input.action === "remove_review" || input.action === "remove_review_warn") {
    const review = await Review.findById(targetId).populate("foodId", "name");
    if (!review) return { error: "TARGET_MISSING" };
    review.status = "hidden";
    review.updatedAt = new Date();
    await review.save();
    const food = review.foodId as { _id: unknown; name?: string } | null;
    if (food?._id) await recalculateFoodRating(String(food._id));

    const authorId = String(review.userId);
    let warningCount: number | undefined;
    if (input.action === "remove_review_warn") {
      const author = (await User.findByIdAndUpdate(authorId, { $inc: { warningCount: 1 } }, { new: true })
        .select("warningCount")
        .lean()) as { warningCount?: number } | null;
      warningCount = author?.warningCount ?? 1;
      audit.warningCount = author?.warningCount ?? null;
    }
    // Không tiết lộ ai đã báo cáo (BR-M14) — payload không có thông tin người báo cáo.
    await notify(authorId, {
      type: "content_removed",
      payload: {
        targetType: "review",
        targetId,
        name: food?.name ?? "",
        reason: note,
        ...(warningCount !== undefined && { warningCount }),
      },
      actorId: adminId,
    });
    reporterOutcome = { outcome: "removed" };
  } else if (input.action === "edit_info") {
    const results = [];
    if (targetType === "food" && input.food) {
      results.push(await editFood({ actorId: adminId, scope: "admin", foodId: targetId, edit: input.food, reason: note, context: "report_case" }));
    }
    if (targetType === "restaurant" && input.restaurant) {
      results.push(
        await editRestaurant({ actorId: adminId, scope: "admin", restaurantId: targetId, edit: input.restaurant, reason: note, context: "report_case" }),
      );
    }
    // Không có gì để sửa, sửa sai giá trị, hoặc không đổi gì so với hiện tại đều là yêu cầu không hợp lệ.
    if (results.length === 0 || results.some((result) => result.error)) return { error: "INVALID_EDIT" };
    reporterOutcome = { outcome: "updated", detail: "edited" };
  } else if (input.action === "mark_closed") {
    const updated = await Restaurant.findOneAndUpdate(
      { _id: targetId },
      { $set: { businessStatus: "closed", closedAt: new Date(), updatedAt: new Date() } },
    );
    if (!updated) return { error: "TARGET_MISSING" };
    await AuditLog.create({ actorId: adminId, action: "restaurant_close", targetType: "restaurant", targetId, reason: note, metadata: { name: updated.name } });
    reporterOutcome = { outcome: "updated", detail: "closed" };
  } else if (input.action === "merge_restaurant") {
    if (!input.confirm) return { error: "INVALID_MERGE_TARGET" };
    const mergeInto = input.mergeIntoRestaurantId;
    if (!isValidObjectId(mergeInto) || mergeInto === targetId) return { error: "INVALID_MERGE_TARGET" };
    const [duplicate, original] = (await Promise.all([
      Restaurant.findOne({ _id: targetId, visibility: { $ne: "deleted" } }).select("name").lean(),
      Restaurant.findOne({ _id: mergeInto, visibility: { $ne: "deleted" }, moderationStatus: "approved" }).select("name").lean(),
    ])) as unknown as [{ name: string } | null, { name: string } | null];
    if (!duplicate) return { error: "TARGET_MISSING" };
    if (!original) return { error: "INVALID_MERGE_TARGET" };
    const movedFoods = await mergeRestaurants(targetId, mergeInto);
    await AuditLog.create({
      actorId: adminId,
      action: "restaurant_merge",
      targetType: "restaurant",
      targetId,
      reason: note,
      metadata: {
        name: duplicate.name,
        mergedInto: mergeInto,
        mergedIntoName: original.name,
        movedFoods,
      },
    });
    audit.mergedInto = mergeInto;
    reporterOutcome = { outcome: "updated", detail: "merged" };
  } else {
    return { error: "ACTION_NOT_ALLOWED" };
  }

  reportCase.status = input.action === "dismiss" ? "dismissed" : "resolved";
  reportCase.action = input.action;
  reportCase.resolutionNote = note;
  reportCase.resolvedBy = adminId;
  reportCase.resolvedAt = new Date();
  reportCase.updatedAt = new Date();
  await reportCase.save();

  await AuditLog.create({
    actorId: adminId,
    action: input.action === "dismiss" ? "report_case_dismiss" : "report_case_resolve",
    targetType: "report",
    targetId: caseId,
    reason: note,
    metadata: { decision: input.action, originalTargetType: targetType, originalTargetId: targetId, ...audit },
  });
  await notifyReporters(reportCase._id, targetType, reporterOutcome, adminId);
  return { error: null };
}

/** Mở lại quán đã đánh dấu đóng cửa (ngoài luồng case). */
export async function reopenRestaurant(adminId: string, restaurantId: string, note: string): Promise<{ error: "NOT_FOUND" | null }> {
  if (!isValidObjectId(restaurantId)) return { error: "NOT_FOUND" };
  await connectDB();
  const restaurant = await Restaurant.findOneAndUpdate(
    { _id: restaurantId, businessStatus: "closed" },
    { $set: { businessStatus: "open", updatedAt: new Date() }, $unset: { closedAt: "" } },
  );
  if (!restaurant) return { error: "NOT_FOUND" };
  await AuditLog.create({
    actorId: adminId,
    action: "restaurant_reopen",
    targetType: "restaurant",
    targetId: restaurantId,
    reason: note.trim() || undefined,
    metadata: { name: restaurant.name },
  });
  return { error: null };
}

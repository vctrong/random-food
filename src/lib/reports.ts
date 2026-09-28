import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Report } from "@/lib/models/Report";
import { ReportCase } from "@/lib/models/ReportCase";
import { Review } from "@/lib/models/Review";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { hitRateLimit } from "@/lib/rateLimit";
import { recalculateFoodRating } from "@/lib/reviews";
import { notifyAdmins } from "@/lib/notifications/notify";
import {
  MAX_REPORTS_PER_DAY,
  REVIEW_AUTO_HIDE_THRESHOLD,
  reasonsForTarget,
  type ReportReason,
  type ReportTargetType,
} from "@/constants/reports";

/**
 * Phía USER của luồng báo cáo (docs/report-flow.md, BR-M06→M11): gửi báo cáo,
 * hoàn tác, và tra cứu mình đã báo cáo gì. Mọi luật chống lạm dụng kiểm ở đây.
 */

export type SubmitReportError =
  | "INVALID_TARGET"
  | "INVALID_REASON"
  | "NOTE_REQUIRED"
  | "DUPLICATE_TARGET_REQUIRED"
  | "OWN_CONTENT"
  | "ALREADY_REPORTED"
  | "DAILY_LIMIT";

export interface SubmitReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
  duplicateOfRestaurantId?: string | null;
}

interface TargetInfo {
  ownerId: string | null;
  foodId: string | null;
}

/** Đối tượng còn công khai (được phép báo cáo) + chủ sở hữu để chặn tự báo cáo nội dung của mình. */
async function loadTarget(targetType: ReportTargetType, targetId: string): Promise<TargetInfo | null> {
  if (targetType === "review") {
    const review = (await Review.findOne({
      _id: targetId,
      deletedAt: null,
      status: { $in: ["visible", "hidden_pending_review"] },
    })
      .select("userId foodId")
      .lean()) as { userId?: unknown; foodId?: unknown } | null;
    return review ? { ownerId: String(review.userId), foodId: String(review.foodId) } : null;
  }
  const Model = targetType === "food" ? Food : Restaurant;
  const doc = (await Model.findOne({ _id: targetId, moderationStatus: "approved", visibility: "visible" })
    .select("createdBy")
    .lean()) as { createdBy?: unknown } | null;
  return doc ? { ownerId: doc.createdBy ? String(doc.createdBy) : null, foodId: null } : null;
}

/** "Mỗi ngày" tính theo giờ Việt Nam; hoàn tác không trả lại lượt (BR-M08). */
function vnDayKey(now = new Date()): { key: string; msUntilMidnight: number } {
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const key = vn.toISOString().slice(0, 10);
  const nextMidnightVn = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 1) - 7 * 60 * 60 * 1000;
  return { key, msUntilMidnight: Math.max(1000, nextMidnightVn - now.getTime()) };
}

async function bumpCase(targetType: ReportTargetType, targetId: string, reason: ReportReason, delta: 1 | -1) {
  const update = {
    $inc: { reportCount: delta, [`reasonCounts.${reason}`]: delta },
    $set: { updatedAt: new Date() },
  };
  if (delta === -1) {
    return ReportCase.findOneAndUpdate({ targetType, targetId, status: "pending" }, update, { new: true }).lean();
  }
  const upsert = () =>
    ReportCase.findOneAndUpdate(
      { targetType, targetId, status: "pending" },
      { ...update, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
  try {
    return await upsert();
  } catch {
    // 2 báo cáo đầu tiên cùng lúc → 1 bên dính unique index một phần; thử lại là cộng vào case vừa tạo.
    return upsert();
  }
}

/** Đánh giá: ≥ 3 user khác nhau báo cáo → ẩn tạm; tụt dưới ngưỡng (hoàn tác) → hiện lại (BR-M09). */
async function syncReviewAutoHide(reviewId: string, reportCount: number) {
  const shouldHide = reportCount >= REVIEW_AUTO_HIDE_THRESHOLD;
  const review = (await Review.findOneAndUpdate(
    { _id: reviewId, status: shouldHide ? "visible" : "hidden_pending_review" },
    { $set: { status: shouldHide ? "hidden_pending_review" : "visible", updatedAt: new Date() } },
    { new: true },
  )
    .select("foodId")
    .lean()) as { foodId?: unknown } | null;
  if (review?.foodId) await recalculateFoodRating(String(review.foodId));
}

export async function submitReport(
  userId: string,
  input: SubmitReportInput,
): Promise<{ error: SubmitReportError | null; reportId?: string }> {
  const { targetType, targetId, reason } = input;
  const note = input.note?.trim() ?? "";

  if (!isValidObjectId(targetId)) return { error: "INVALID_TARGET" };
  if (!reasonsForTarget(targetType).includes(reason)) return { error: "INVALID_REASON" };
  if (reason === "other" && !note) return { error: "NOTE_REQUIRED" };

  await connectDB();
  const target = await loadTarget(targetType, targetId);
  if (!target) return { error: "INVALID_TARGET" };
  if (target.ownerId === userId) return { error: "OWN_CONTENT" };

  let duplicateOf: string | null = null;
  if (reason === "duplicate") {
    const candidate = input.duplicateOfRestaurantId ?? "";
    if (!isValidObjectId(candidate) || candidate === targetId) return { error: "DUPLICATE_TARGET_REQUIRED" };
    const exists = await Restaurant.exists({ _id: candidate, moderationStatus: "approved", visibility: "visible" });
    if (!exists) return { error: "DUPLICATE_TARGET_REQUIRED" };
    duplicateOf = candidate;
  }

  if (await Report.exists({ reporterId: userId, targetType, targetId })) return { error: "ALREADY_REPORTED" };

  const day = vnDayKey();
  const limit = await hitRateLimit(`report:day:${day.key}:user:${userId}`, MAX_REPORTS_PER_DAY, day.msUntilMidnight);
  if (!limit.allowed) return { error: "DAILY_LIMIT" };

  const reportCase = (await bumpCase(targetType, targetId, reason, 1)) as { _id: unknown; reportCount: number } | null;
  if (!reportCase) return { error: "INVALID_TARGET" };

  let reportId: string;
  try {
    const report = await Report.create({
      reporterId: userId,
      targetType,
      targetId,
      reason,
      ...(note && { note }),
      ...(duplicateOf && { duplicateOfRestaurantId: duplicateOf }),
      caseId: reportCase._id,
    });
    reportId = String(report._id);
  } catch (error) {
    await bumpCase(targetType, targetId, reason, -1);
    if (error instanceof Error && error.message.includes("E11000")) return { error: "ALREADY_REPORTED" };
    throw error;
  }

  if (targetType === "review") await syncReviewAutoHide(targetId, reportCase.reportCount);
  // Chỉ báo Admin khi MỞ case (báo cáo đầu tiên) — các báo cáo sau đã có badge đếm.
  if (reportCase.reportCount === 1) {
    await notifyAdmins({ type: "report_created", payload: { caseId: String(reportCase._id), targetType } });
  }
  return { error: null, reportId };
}

export type UndoReportError = "NOT_FOUND" | "CASE_CLOSED";

/** Hoàn tác = xoá báo cáo của chính mình, CHỈ khi case còn chờ xử lý. */
export async function undoReport(
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<{ error: UndoReportError | null }> {
  if (!isValidObjectId(targetId)) return { error: "NOT_FOUND" };
  await connectDB();

  const report = (await Report.findOne({ reporterId: userId, targetType, targetId }).lean()) as {
    _id: unknown;
    reason: ReportReason;
    caseId: unknown;
  } | null;
  if (!report) return { error: "NOT_FOUND" };

  const reportCase = (await ReportCase.findById(report.caseId).select("status").lean()) as { status?: string } | null;
  if (reportCase?.status !== "pending") return { error: "CASE_CLOSED" };

  await Report.deleteOne({ _id: report._id });
  const updated = (await bumpCase(targetType, targetId, report.reason, -1)) as { _id: unknown; reportCount: number } | null;
  if (updated && updated.reportCount <= 0) await ReportCase.deleteOne({ _id: updated._id, reportCount: { $lte: 0 } });
  if (targetType === "review") await syncReviewAutoHide(targetId, Math.max(0, updated?.reportCount ?? 0));
  return { error: null };
}

export interface MyReportState {
  targetId: string;
  /** Case còn pending → được hoàn tác. */
  canUndo: boolean;
}

/** Trong các đối tượng `targetIds`, user đã báo cáo cái nào (và còn hoàn tác được không). */
export async function getMyReportStates(
  userId: string,
  targetType: ReportTargetType,
  targetIds: string[],
): Promise<MyReportState[]> {
  const ids = targetIds.filter((id) => isValidObjectId(id)).map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return [];
  await connectDB();
  const reports = (await Report.find({ reporterId: userId, targetType, targetId: { $in: ids } })
    .select("targetId caseId")
    .populate("caseId", "status")
    .lean()) as unknown as { targetId: unknown; caseId?: { status?: string } | null }[];
  return reports.map((report) => ({ targetId: String(report.targetId), canUndo: report.caseId?.status === "pending" }));
}

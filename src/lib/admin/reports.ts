import { connectDB } from "@/lib/mongodb";
import { Report } from "@/lib/models/Report";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Review } from "@/lib/models/Review";
import { User } from "@/lib/models/User";
import { AuditLog } from "@/lib/models/AuditLog";
import { createNotification } from "@/lib/notify";
import type { AdminReportRow, ReportAction, ReportTargetType } from "@/types/admin";

interface LeanUserRef {
  _id: unknown;
  name?: string;
  avatarUrl?: string;
}

function toUserRef(value: unknown): { id: string; name: string; avatarUrl: string | null } {
  const user = value as LeanUserRef | null;
  if (!user || !user._id) return { id: "", name: "Người dùng đã xoá", avatarUrl: null };
  return { id: String(user._id), name: user.name ?? "Người dùng ẩn danh", avatarUrl: user.avatarUrl ?? null };
}

async function getTargetLabel(targetType: ReportTargetType, targetId: unknown): Promise<string | null> {
  if (targetType === "food") {
    const food = (await Food.findById(targetId).select("name").lean()) as { name?: string } | null;
    return food?.name ?? null;
  }
  if (targetType === "restaurant") {
    const restaurant = (await Restaurant.findById(targetId).select("name").lean()) as { name?: string } | null;
    return restaurant?.name ?? null;
  }
  const review = (await Review.findById(targetId).select("comment").lean()) as { comment?: string } | null;
  return review?.comment ?? "Đánh giá không có bình luận";
}

export async function getReports(statusFilter?: "pending" | "reviewed"): Promise<AdminReportRow[]> {
  await connectDB();
  const query = statusFilter ? { status: statusFilter } : {};

  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .populate("reporterId", "name avatarUrl")
    .populate("handledBy", "name")
    .lean();

  const rows: AdminReportRow[] = [];
  for (const report of reports) {
    const handledBy = report.handledBy as unknown as { _id?: unknown; name?: string } | null;
    rows.push({
      id: String(report._id),
      targetType: report.targetType as ReportTargetType,
      targetId: String(report.targetId),
      targetLabel: await getTargetLabel(report.targetType as ReportTargetType, report.targetId),
      reason: report.reason,
      status: report.status as "pending" | "reviewed",
      action: (report.action ?? null) as ReportAction | null,
      reporter: toUserRef(report.reporterId),
      handledBy: handledBy?._id ? { id: String(handledBy._id), name: handledBy.name ?? "" } : null,
      handledAt: report.handledAt ? report.handledAt.toISOString() : null,
      createdAt: (report.createdAt ?? new Date()).toISOString(),
    });
  }
  return rows;
}

async function getOwnerId(targetType: ReportTargetType, targetId: unknown): Promise<string | null> {
  if (targetType === "food") {
    const food = (await Food.findById(targetId).select("createdBy").lean()) as { createdBy?: unknown } | null;
    return food?.createdBy ? String(food.createdBy) : null;
  }
  if (targetType === "restaurant") {
    const restaurant = (await Restaurant.findById(targetId).select("createdBy").lean()) as { createdBy?: unknown } | null;
    return restaurant?.createdBy ? String(restaurant.createdBy) : null;
  }
  const review = (await Review.findById(targetId).select("userId").lean()) as { userId?: unknown } | null;
  return review?.userId ? String(review.userId) : null;
}

async function applyTargetAction(targetType: ReportTargetType, targetId: unknown, action: "hide" | "remove") {
  const visibility = action === "remove" ? "deleted" : "hidden";
  if (targetType === "food") await Food.findByIdAndUpdate(targetId, { visibility, updatedAt: new Date() });
  else if (targetType === "restaurant")
    await Restaurant.findByIdAndUpdate(targetId, { visibility, updatedAt: new Date() });
  else await Review.findByIdAndUpdate(targetId, { status: "hidden", updatedAt: new Date() });
}

type HandleReportError = "NOT_FOUND" | "NOT_PENDING";

export async function handleReport({
  adminId,
  reportId,
  action,
  note,
}: {
  adminId: string;
  reportId: string;
  action: ReportAction;
  note: string;
}): Promise<{ error: HandleReportError | null }> {
  await connectDB();
  const report = await Report.findById(reportId);
  if (!report) return { error: "NOT_FOUND" };
  if (report.status !== "pending") return { error: "NOT_PENDING" };

  const targetType = report.targetType as ReportTargetType;

  if (action === "hide" || action === "remove") {
    await applyTargetAction(targetType, report.targetId, action);
  }

  if (action === "warn_user" || action === "ban_user") {
    const ownerId = await getOwnerId(targetType, report.targetId);
    if (ownerId) {
      if (action === "warn_user") {
        await User.findByIdAndUpdate(ownerId, { $inc: { warningCount: 1 } });
      } else {
        await User.findByIdAndUpdate(ownerId, {
          accountStatus: "banned",
          $inc: { sessionVersion: 1 },
        });
        await createNotification({
          userId: ownerId,
          type: "account_banned",
          message: `Tài khoản của bạn đã bị khoá do vi phạm bị báo cáo.${note.trim() ? ` Lý do: ${note.trim()}` : ""}`,
        });
      }
    }
  }

  report.status = "reviewed";
  report.action = action;
  report.handledBy = adminId as unknown as typeof report.handledBy;
  report.handledAt = new Date();
  await report.save();

  await AuditLog.create({
    actorId: adminId,
    action: "handle_report",
    targetType: "report",
    targetId: reportId,
    reason: note.trim() || undefined,
    metadata: { decision: action, originalTargetType: targetType },
  });

  await createNotification({
    userId: String(report.reporterId),
    type: "report_handled",
    message: `Báo cáo của bạn đã được xử lý.${note.trim() ? ` Ghi chú: ${note.trim()}` : ""}`,
    relatedId: reportId,
  });

  return { error: null };
}

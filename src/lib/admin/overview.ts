import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Report } from "@/lib/models/Report";
import { FoodReviewerApplication } from "@/lib/models/FoodReviewerApplication";
import { CategoryProposal } from "@/lib/models/CategoryProposal";
import { AuditLog } from "@/lib/models/AuditLog";
import type { AdminActivityEntry, AdminOverviewStats } from "@/types/admin";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getOverviewStats(): Promise<AdminOverviewStats> {
  await connectDB();

  const [
    totalUsers,
    bannedUsers,
    pendingFoods,
    pendingRestaurants,
    pendingReports,
    pendingReviewerApplications,
    pendingCategoryProposals,
    auditLogLast7Days,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ accountStatus: "banned" }),
    Food.countDocuments({ moderationStatus: "pending" }),
    Restaurant.countDocuments({ moderationStatus: "pending" }),
    Report.countDocuments({ status: "pending" }),
    FoodReviewerApplication.countDocuments({ status: "pending" }),
    CategoryProposal.countDocuments({ status: "pending" }),
    AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - SEVEN_DAYS_MS) } }),
  ]);

  return {
    totalUsers,
    bannedUsers,
    pendingFoods,
    pendingRestaurants,
    pendingReports,
    pendingReviewerApplications,
    pendingCategoryProposals,
    auditLogLast7Days,
  };
}

export async function getRecentActivity(limit = 10): Promise<AdminActivityEntry[]> {
  await connectDB();

  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actorId", "name")
    .lean();

  return logs.map((log) => {
    const actor = log.actorId as unknown as { name?: string } | null;
    const metadata = (log.metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(log._id),
      actorName: actor?.name ?? "Hệ thống",
      action: log.action,
      targetType: log.targetType,
      targetName: typeof metadata.name === "string" ? metadata.name : null,
      reason: log.reason ?? null,
      createdAt: (log.createdAt ?? new Date()).toISOString(),
    };
  });
}

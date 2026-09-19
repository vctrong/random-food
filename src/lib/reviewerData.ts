import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { AuditLog } from "@/lib/models/AuditLog";
import { User } from "@/lib/models/User";
// Đăng ký model Category để .populate("categoryIds") hoạt động (Mongoose cần
// model đã register trước, dù không dùng trực tiếp import này).
import "@/lib/models/Category";
import { createNotification } from "@/lib/notify";
import { getContributionOverview } from "@/lib/achievements";
import type {
  ModerationDecision,
  ModerationTargetType,
  ReviewHistoryEntry,
  ReviewHistorySummary,
  ReviewHistoryStatusFilter,
  ReviewQueueItem,
  ReviewSubmitter,
} from "@/types/reviewer";

/**
 * Lớp truy vấn dữ liệu cho khu vực thẩm định FoodReviewer (BR_UC mục 3.3).
 * Không có model DB riêng — ghép từ Food/Restaurant (moderationStatus=pending)
 * và AuditLog (lịch sử approve_food/reject_food/needs_revision). Dùng trực
 * tiếp trong app/reviewer/*​/page.tsx (SSR ban đầu, cùng cách cai-dat/page.tsx
 * đã làm) và trong app/api/reviewer/*​/route.ts (client refetch/mutation).
 */

/**
 * BR-01/BR-06: chỉ FoodReviewer hoặc Admin được vào khu vực thẩm định.
 * Phân biệt rõ 401 (chưa đăng nhập) và 403 (đã đăng nhập nhưng sai role) —
 * khác /admin (fail-as-404), khu vực /reviewer không cần ẩn sự tồn tại.
 */
export type ReviewerSessionResult =
  | { ok: true; id: string; role: string }
  | { ok: false; status: 401 | 403 };

export async function requireReviewerSession(): Promise<ReviewerSessionResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return { ok: false, status: 401 };
  if (user.role !== "foodreviewer" && user.role !== "admin") return { ok: false, status: 403 };
  return { ok: true, id: user.id, role: user.role };
}

const DECISION_TO_ACTION: Record<ModerationDecision, string> = {
  approved: "approve_food",
  rejected: "reject_food",
  needs_revision: "needs_revision",
};

const HISTORY_ACTIONS = Object.values(DECISION_TO_ACTION);

function actionToDecision(action: string): ModerationDecision {
  if (action === "approve_food") return "approved";
  if (action === "reject_food") return "rejected";
  return "needs_revision";
}

interface LeanCreatedBy {
  _id: unknown;
  name?: string;
  avatarUrl?: string;
}

function toSubmitter(createdBy: unknown): ReviewSubmitter {
  const user = createdBy as LeanCreatedBy | null;
  if (!user || !user._id) {
    return { id: "", name: "Người dùng đã xoá", avatarUrl: null };
  }
  return {
    id: String(user._id),
    name: user.name ?? "Người dùng ẩn danh",
    avatarUrl: user.avatarUrl ?? null,
  };
}

interface LeanCategory {
  _id: unknown;
  name: string;
}

function toCategoryNames(categoryIds: unknown): string[] {
  const categories = (categoryIds ?? []) as LeanCategory[];
  return categories.map((category) => category.name).filter(Boolean);
}

/** BR-F02/F03: reviewer không được tự duyệt nội dung của chính mình. Nếu hệ
 * thống chỉ có đúng 1 reviewer (chính là người submit) thì phải chuyển Admin. */
function buildLock(isSelfSubmitted: boolean, otherReviewerCount: number) {
  if (!isSelfSubmitted) return { canDecide: true, lockReason: null };
  const lockReason =
    otherReviewerCount === 0
      ? "Bạn là FoodReviewer duy nhất và cũng là người đóng góp mục này — cần Admin xử lý trực tiếp (BR-F03)."
      : "Không thể tự duyệt nội dung do chính bạn đóng góp — cần FoodReviewer khác xử lý (BR-F02).";
  return { canDecide: false, lockReason };
}

export async function getPendingQueue(reviewerId: string): Promise<ReviewQueueItem[]> {
  await connectDB();

  const [foods, restaurants, otherReviewerCount] = await Promise.all([
    Food.find({ moderationStatus: "pending" })
      .sort({ createdAt: 1 })
      .populate("restaurantId", "name address location openingHours")
      .populate("categoryIds", "name")
      .populate("createdBy", "name avatarUrl")
      .lean(),
    Restaurant.find({ moderationStatus: "pending" }).sort({ createdAt: 1 }).populate("createdBy", "name avatarUrl").lean(),
    User.countDocuments({ role: "foodreviewer", accountStatus: "active", _id: { $ne: reviewerId } }),
  ]);

  const foodItems: ReviewQueueItem[] = foods.map((food) => {
    const restaurant = food.restaurantId as unknown as {
      name?: string;
      address?: string;
      openingHours?: string;
      location?: { coordinates?: [number, number] };
    } | null;
    const isSelfSubmitted = String(food.createdBy && (food.createdBy as { _id?: unknown })._id) === reviewerId;
    const coordinates = restaurant?.location?.coordinates;

    return {
      targetType: "food",
      id: String(food._id),
      name: food.name,
      description: food.description ?? "",
      images: food.images ?? [],
      priceMin: food.priceRange?.min ?? null,
      priceMax: food.priceRange?.max ?? null,
      address: restaurant?.address ?? null,
      location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
      categoryNames: toCategoryNames(food.categoryIds),
      eatingLevels: food.eatingLevels ?? [],
      restaurantName: restaurant?.name ?? null,
      openingHours: restaurant?.openingHours ?? null,
      submitter: toSubmitter(food.createdBy),
      createdAt: (food.createdAt ?? new Date()).toISOString(),
      isSelfSubmitted,
      ...buildLock(isSelfSubmitted, otherReviewerCount),
    };
  });

  const restaurantItems: ReviewQueueItem[] = restaurants.map((restaurant) => {
    const isSelfSubmitted = String(restaurant.createdBy && (restaurant.createdBy as { _id?: unknown })._id) === reviewerId;
    const coordinates = restaurant.location?.coordinates;

    return {
      targetType: "restaurant",
      id: String(restaurant._id),
      name: restaurant.name,
      description: "",
      images: [],
      priceMin: null,
      priceMax: null,
      address: restaurant.address,
      location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
      categoryNames: [],
      eatingLevels: [],
      restaurantName: null,
      openingHours: restaurant.openingHours ?? null,
      submitter: toSubmitter(restaurant.createdBy),
      createdAt: (restaurant.createdAt ?? new Date()).toISOString(),
      isSelfSubmitted,
      ...buildLock(isSelfSubmitted, otherReviewerCount),
    };
  });

  return [...foodItems, ...restaurantItems].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function getPendingQueueCount(): Promise<number> {
  await connectDB();
  const [foodCount, restaurantCount] = await Promise.all([
    Food.countDocuments({ moderationStatus: "pending" }),
    Restaurant.countDocuments({ moderationStatus: "pending" }),
  ]);
  return foodCount + restaurantCount;
}

type DecisionError = "NOT_FOUND" | "NOT_PENDING" | "SELF_SUBMITTED" | "REASON_REQUIRED";

interface ApplyDecisionInput {
  reviewerId: string;
  targetType: ModerationTargetType;
  targetId: string;
  decision: ModerationDecision;
  note: string;
}

/** BR-F01→F09: approve/reject/needs_revision + audit log + notification. */
export async function applyModerationDecision({
  reviewerId,
  targetType,
  targetId,
  decision,
  note,
}: ApplyDecisionInput): Promise<{ error: DecisionError | null }> {
  if (decision !== "approved" && !note.trim()) {
    // BR-F06 (reject) / BR-F07 (needs_revision) bắt buộc có lý do.
    return { error: "REASON_REQUIRED" };
  }

  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Food/Restaurant có shape verification/moderationStatus giống nhau, nhưng khác model TS nên union type gây lỗi thừa.
  const Model: any = targetType === "food" ? Food : Restaurant;
  const item = await Model.findById(targetId);
  if (!item) return { error: "NOT_FOUND" };
  if (item.moderationStatus !== "pending") return { error: "NOT_PENDING" }; // BR-F01
  if (String(item.createdBy) === reviewerId) return { error: "SELF_SUBMITTED" }; // BR-F02/F03

  item.moderationStatus = decision;
  if (decision === "approved") {
    // BR-F04/F05: approve phải ghi người duyệt, ngày xác minh, ghi chú thẩm định.
    item.verification = { verifiedBy: reviewerId, verifiedAt: new Date(), note: note.trim() || undefined };
    item.moderationNote = undefined;
  } else {
    item.moderationNote = note.trim();
  }
  item.updatedAt = new Date();
  await item.save();

  await AuditLog.create({
    actorId: reviewerId,
    action: DECISION_TO_ACTION[decision],
    targetType,
    targetId,
    reason: note.trim() || undefined,
    metadata: { name: item.name },
  });

  const label = targetType === "food" ? "Món ăn" : "Quán ăn";
  const decisionMessage =
    decision === "approved"
      ? "đã được duyệt và hiển thị công khai."
      : decision === "rejected"
        ? `đã bị từ chối. Lý do: ${note.trim()}`
        : `cần bạn chỉnh sửa thêm. Ghi chú: ${note.trim()}`;
  const notificationType = decision === "approved" ? "food_approved" : decision === "rejected" ? "food_rejected" : "food_needs_revision";

  await createNotification({
    userId: String(item.createdBy),
    type: notificationType,
    message: `${label} "${item.name}" ${decisionMessage}`,
    relatedId: targetId,
  });

  if (decision === "approved") {
    // Trao thành tựu ngay khi duyệt; lỗi ở bước phụ này không được làm hỏng quyết định đã ghi.
    await getContributionOverview(String(item.createdBy)).catch(() => undefined);
  }

  return { error: null };
}

interface HistoryQuery {
  reviewerId: string;
  status?: ReviewHistoryStatusFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getReviewerHistory({
  reviewerId,
  status = "all",
  search = "",
  page = 1,
  pageSize = 10,
}: HistoryQuery): Promise<{ entries: ReviewHistoryEntry[]; total: number }> {
  await connectDB();

  const actionFilter = status === "all" ? HISTORY_ACTIONS : [DECISION_TO_ACTION[status === "needs_revision" ? "needs_revision" : status]];

  const logs = await AuditLog.find({ actorId: reviewerId, action: { $in: actionFilter } })
    .sort({ createdAt: -1 })
    .lean();

  const foodIds = logs.filter((log) => log.targetType === "food").map((log) => log.targetId);
  const restaurantIds = logs.filter((log) => log.targetType === "restaurant").map((log) => log.targetId);

  const [foods, restaurants] = await Promise.all([
    Food.find({ _id: { $in: foodIds } })
      .populate("createdBy", "name avatarUrl")
      .populate("categoryIds", "name")
      .lean(),
    Restaurant.find({ _id: { $in: restaurantIds } })
      .populate("createdBy", "name avatarUrl")
      .lean(),
  ]);

  const foodMap = new Map(foods.map((food) => [String(food._id), food]));
  const restaurantMap = new Map(restaurants.map((restaurant) => [String(restaurant._id), restaurant]));

  let entries: ReviewHistoryEntry[] = logs.flatMap((log) => {
    const targetType = log.targetType as ModerationTargetType;
    const target = targetType === "food" ? foodMap.get(String(log.targetId)) : restaurantMap.get(String(log.targetId));
    if (!target) return []; // nội dung đã bị xoá — bỏ khỏi lịch sử hiển thị

    const isFood = targetType === "food";
    const foodTarget = target as (typeof foods)[number];
    const submittedAt = target.createdAt ? new Date(target.createdAt) : null;
    const decidedAt = new Date(log.createdAt ?? new Date());
    const processingMinutes = submittedAt ? Math.max(0, Math.round((decidedAt.getTime() - submittedAt.getTime()) / 60000)) : null;

    return [
      {
        logId: String(log._id),
        targetType,
        targetId: String(log.targetId),
        name: target.name,
        images: isFood ? (foodTarget.images ?? []) : [],
        address: isFood ? null : (target as (typeof restaurants)[number]).address,
        priceMin: isFood ? (foodTarget.priceRange?.min ?? null) : null,
        priceMax: isFood ? (foodTarget.priceRange?.max ?? null) : null,
        categoryNames: isFood ? toCategoryNames(foodTarget.categoryIds) : [],
        submitter: toSubmitter(target.createdBy),
        decision: actionToDecision(log.action),
        reason: log.reason ?? null,
        decidedAt: decidedAt.toISOString(),
        submittedAt: submittedAt ? submittedAt.toISOString() : null,
        processingMinutes,
      },
    ];
  });

  if (search.trim()) {
    const query = search.trim().toLowerCase();
    entries = entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.submitter.name.toLowerCase().includes(query) ||
        entry.logId.toLowerCase().includes(query),
    );
  }

  const total = entries.length;
  const start = (page - 1) * pageSize;
  return { entries: entries.slice(start, start + pageSize), total };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getReviewerHistorySummary(reviewerId: string): Promise<ReviewHistorySummary> {
  await connectDB();

  const logs = await AuditLog.find({ actorId: reviewerId, action: { $in: HISTORY_ACTIONS } })
    .select("action targetType targetId createdAt")
    .lean();

  const approved = logs.filter((log) => log.action === "approve_food").length;
  const rejected = logs.filter((log) => log.action === "reject_food").length;
  const needsRevision = logs.filter((log) => log.action === "needs_revision").length;
  const last7Days = logs.filter((log) => Date.now() - new Date(log.createdAt ?? 0).getTime() <= SEVEN_DAYS_MS).length;

  const foodIds = logs.filter((log) => log.targetType === "food").map((log) => log.targetId);
  const restaurantIds = logs.filter((log) => log.targetType === "restaurant").map((log) => log.targetId);
  const [foods, restaurants] = await Promise.all([
    Food.find({ _id: { $in: foodIds } }).select("createdAt").lean(),
    Restaurant.find({ _id: { $in: restaurantIds } }).select("createdAt").lean(),
  ]);
  const submittedAtMap = new Map<string, Date>();
  for (const food of foods) submittedAtMap.set(String(food._id), new Date(food.createdAt ?? Date.now()));
  for (const restaurant of restaurants) submittedAtMap.set(String(restaurant._id), new Date(restaurant.createdAt ?? Date.now()));

  const processingMinutesList = logs
    .map((log) => {
      const submittedAt = submittedAtMap.get(String(log.targetId));
      if (!submittedAt) return null;
      const decidedAt = new Date(log.createdAt ?? new Date());
      return Math.max(0, Math.round((decidedAt.getTime() - submittedAt.getTime()) / 60000));
    })
    .filter((value): value is number => value !== null);

  const avgProcessingMinutes =
    processingMinutesList.length > 0
      ? Math.round(processingMinutesList.reduce((sum, value) => sum + value, 0) / processingMinutesList.length)
      : null;

  return {
    total: logs.length,
    approved,
    needsRevision,
    rejected,
    last7Days,
    avgProcessingMinutes,
  };
}

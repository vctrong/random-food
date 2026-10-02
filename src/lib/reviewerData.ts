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
import { SubmissionNote } from "@/lib/models/SubmissionNote";
import { releaseExpiredClaims } from "@/lib/submissionClaims";
import { ACTIVE_SUBMISSION_STATUSES, claimCutoff, claimExpiresAt } from "@/features/contributions/submissionRules";
import type {
  ModerationDecision,
  ModerationTargetType,
  ReviewHistoryEntry,
  ReviewHistorySummary,
  ReviewHistoryStatusFilter,
  ReviewQueue,
  ReviewQueueItem,
  ReviewQueueNote,
  ReviewQueueProposal,
  ReviewSubmitter,
} from "@/types/reviewer";
import type { LocationSource } from "@/types/restaurant";

/**
 * Lớp truy vấn dữ liệu cho khu vực thẩm định FoodReviewer (BR_UC mục 3.3) — chỉ đọc.
 * Ghép từ Food/Restaurant + AuditLog (lịch sử approve_food/reject_food/needs_revision)
 * + SubmissionNote. Mọi chuyển trạng thái nằm ở lib/submissionWorkflow.ts. Dùng trực
 * tiếp trong các page của khu vực /reviewer (SSR ban đầu) và các route /api/reviewer.
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

/** Shape của Food trong hàng chờ sau `.lean()` + populate. */
interface LeanQueueFood {
  _id: unknown;
  name: string;
  description?: string;
  images?: string[];
  priceRange?: { min?: number; max?: number };
  categoryIds?: unknown;
  eatingLevels?: string[];
  restaurantId?: {
    _id: unknown;
    name?: string;
    address?: string;
    openingHours?: string;
    images?: string[];
    locationSource?: LocationSource;
    location?: { coordinates?: [number, number] };
    moderationStatus?: string;
    createdBy?: unknown;
  } | null;
  proposedCategoryId?: { _id: unknown; name: string; proposalCount?: number; status: ReviewQueueProposal["status"] } | null;
  createdBy?: unknown;
  moderationStatus: string;
  claimedAt?: Date;
  editCount?: number;
  createdAt?: Date;
}

const QUEUE_RESTAURANT_FIELDS = "name address location locationSource images openingHours moderationStatus createdBy";

async function findQueueFoods(filter: Record<string, unknown>): Promise<LeanQueueFood[]> {
  return (await Food.find(filter)
    .sort({ createdAt: 1 })
    .populate("restaurantId", QUEUE_RESTAURANT_FIELDS)
    .populate("categoryIds", "name")
    .populate("createdBy", "name avatarUrl")
    .populate("proposedCategoryId", "name proposalCount status")
    .lean()) as unknown as LeanQueueFood[];
}

/** _id các quán đang đi kèm 1 đề xuất món còn mở — không hiện thành mục riêng. */
async function findLinkedRestaurantIds(): Promise<unknown[]> {
  return Food.distinct("restaurantId", { moderationStatus: { $in: ACTIVE_SUBMISSION_STATUSES }, visibility: { $ne: "deleted" } });
}

/**
 * UC-F01: hàng chờ tách 2 tab (docs/contribute-food.md mục 8).
 *  - available: món `pending` (chờ nhận) + quán `pending` đứng riêng (dữ liệu cũ, quyết định thẳng).
 *  - mine: món `in_review` do reviewer này giữ, còn hạn — kèm ghi chú đính chính.
 * Quán mới đi kèm món không còn là mục riêng: hiển thị và được quyết định cùng món.
 */
export async function getReviewerQueue(reviewerId: string): Promise<ReviewQueue> {
  await connectDB();
  await releaseExpiredClaims();

  const [pendingFoods, mineFoods, pendingRestaurants, linkedRestaurantIds, otherReviewerCount] = await Promise.all([
    findQueueFoods({ moderationStatus: "pending", visibility: { $ne: "deleted" } }),
    findQueueFoods({ moderationStatus: "in_review", reviewerId, claimedAt: { $gte: claimCutoff() } }),
    Restaurant.find({ moderationStatus: "pending" }).sort({ createdAt: 1 }).populate("createdBy", "name avatarUrl").lean(),
    findLinkedRestaurantIds(),
    User.countDocuments({ role: "foodreviewer", accountStatus: "active", _id: { $ne: reviewerId } }),
  ]);
  const foods = [...pendingFoods, ...mineFoods];

  const proposalIds = foods.map((food) => food.proposedCategoryId?._id).filter(Boolean);
  const [proposalUsage, notes] = await Promise.all([
    Food.aggregate([
      {
        $match: {
          proposedCategoryId: { $in: proposalIds },
          visibility: { $ne: "deleted" },
          moderationStatus: { $nin: ["rejected", "withdrawn"] },
        },
      },
      { $group: { _id: "$proposedCategoryId", count: { $sum: 1 } } },
    ]),
    SubmissionNote.find({ submissionId: { $in: mineFoods.map((food) => food._id) } })
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  const usageByProposal = new Map<string, number>(
    proposalUsage.map((row: { _id: unknown; count: number }) => [String(row._id), row.count]),
  );
  const notesByFood = new Map<string, ReviewQueueNote[]>();
  for (const note of notes as unknown as { _id: unknown; submissionId: unknown; content: string; createdAt?: Date }[]) {
    const key = String(note.submissionId);
    const item = { id: String(note._id), content: note.content, createdAt: new Date(note.createdAt ?? Date.now()).toISOString() };
    notesByFood.set(key, [...(notesByFood.get(key) ?? []), item]);
  }

  const toFoodItem = (food: LeanQueueFood): ReviewQueueItem => {
    const restaurant = food.restaurantId ?? null;
    const proposal = food.proposedCategoryId ?? null;
    const submitterId = String((food.createdBy as { _id?: unknown } | null)?._id);
    const isSelfSubmitted = submitterId === reviewerId;
    const coordinates = restaurant?.location?.coordinates;
    const isMine = food.moderationStatus === "in_review";
    const lock = buildLock(isSelfSubmitted, otherReviewerCount);

    return {
      targetType: "food",
      id: String(food._id),
      status: isMine ? "in_review" : "pending",
      requiresClaim: true,
      claimedAt: isMine && food.claimedAt ? new Date(food.claimedAt).toISOString() : null,
      claimExpiresAt: isMine && food.claimedAt ? claimExpiresAt(food.claimedAt).toISOString() : null,
      hasNewRestaurant: Boolean(restaurant && restaurant.moderationStatus === "pending" && String(restaurant.createdBy) === submitterId),
      restaurantId: restaurant ? String(restaurant._id) : null,
      editCount: food.editCount ?? 0,
      notes: notesByFood.get(String(food._id)) ?? [],
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
      restaurantImages: restaurant?.images ?? [],
      locationSource: restaurant?.locationSource ?? null,
      proposal: proposal
        ? {
            id: String(proposal._id),
            name: proposal.name,
            proposalCount: proposal.proposalCount ?? 1,
            foodCount: usageByProposal.get(String(proposal._id)) ?? 1,
            status: proposal.status,
          }
        : null,
      submitter: toSubmitter(food.createdBy),
      createdAt: (food.createdAt ?? new Date()).toISOString(),
      isSelfSubmitted,
      // Chưa nhận thì chưa quyết định được; lockReason chỉ dành cho BR-F02/F03.
      canDecide: isMine && lock.canDecide,
      lockReason: lock.lockReason,
    };
  };

  const linked = new Set(linkedRestaurantIds.map(String));
  const restaurantItems: ReviewQueueItem[] = pendingRestaurants
    .filter((restaurant) => !linked.has(String(restaurant._id)))
    .map((restaurant) => {
      const isSelfSubmitted = String(restaurant.createdBy && (restaurant.createdBy as { _id?: unknown })._id) === reviewerId;
      const coordinates = restaurant.location?.coordinates;

      return {
        targetType: "restaurant",
        id: String(restaurant._id),
        status: "pending",
        requiresClaim: false,
        claimedAt: null,
        claimExpiresAt: null,
        hasNewRestaurant: false,
        restaurantId: null,
        editCount: 0,
        notes: [],
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
        restaurantImages: restaurant.images ?? [],
        locationSource: (restaurant.locationSource as LocationSource | undefined) ?? null,
        proposal: null,
        submitter: toSubmitter(restaurant.createdBy),
        createdAt: (restaurant.createdAt ?? new Date()).toISOString(),
        isSelfSubmitted,
        ...buildLock(isSelfSubmitted, otherReviewerCount),
      };
    });

  const byCreatedAt = (a: ReviewQueueItem, b: ReviewQueueItem) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return {
    available: [...pendingFoods.map(toFoodItem), ...restaurantItems].sort(byCreatedAt),
    mine: mineFoods.map(toFoodItem).sort(byCreatedAt),
  };
}

/** Badge hàng chờ: món chờ nhận + quán đứng riêng (dữ liệu cũ). Không tính món đang có người giữ. */
export async function getPendingQueueCount(): Promise<number> {
  await connectDB();
  const [foodCount, linkedRestaurantIds] = await Promise.all([
    Food.countDocuments({ moderationStatus: "pending", visibility: { $ne: "deleted" } }),
    findLinkedRestaurantIds(),
  ]);
  const restaurantCount = await Restaurant.countDocuments({ moderationStatus: "pending", _id: { $nin: linkedRestaurantIds } });
  return foodCount + restaurantCount;
}

/** Reviewer đang giữ món còn hạn — điều kiện cho các thao tác phụ khi thẩm định (sửa dữ kiện, đề xuất danh mục). */
export async function isHeldByReviewer(reviewerId: string, foodId: string): Promise<boolean> {
  await connectDB();
  return Boolean(await Food.exists({ _id: foodId, moderationStatus: "in_review", reviewerId, claimedAt: { $gte: claimCutoff() } }));
}

/** Quán `pending` reviewer được đụng tới: quán của món mình đang giữ, hoặc quán đứng riêng (dữ liệu cũ). */
export async function canReviewerTouchRestaurant(reviewerId: string, restaurantId: string): Promise<boolean> {
  await connectDB();
  const restaurant = (await Restaurant.findById(restaurantId).select("moderationStatus").lean()) as { moderationStatus?: string } | null;
  if (restaurant?.moderationStatus !== "pending") return false;
  const [heldFood, activeFood] = await Promise.all([
    Food.exists({ restaurantId, moderationStatus: "in_review", reviewerId, claimedAt: { $gte: claimCutoff() } }),
    Food.exists({ restaurantId, moderationStatus: { $in: ACTIVE_SUBMISSION_STATUSES }, visibility: { $ne: "deleted" } }),
  ]);
  return Boolean(heldFood) || !activeFood;
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

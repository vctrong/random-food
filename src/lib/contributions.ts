import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Favorite } from "@/lib/models/Favorite";
import { AuditLog } from "@/lib/models/AuditLog";
import { SubmissionNote } from "@/lib/models/SubmissionNote";
// Đăng ký model User để .populate("verification.verifiedBy") hoạt động.
import "@/lib/models/User";
import { releaseExpiredClaims } from "@/lib/submissionClaims";
import { deriveContributionStatus } from "@/features/contributions/contributionLogic";
import { getEditPermission, isClaimExpired, remainingEdits } from "@/features/contributions/submissionRules";
import type { Contribution, ContributionFeedback, ContributionStatus, SubmissionNoteItem } from "@/types/contribution";

/**
 * Lớp dữ liệu cho trang "Món đã đóng góp" (UC-U11, UC-U12) — chỉ đọc. Ghép từ Food
 * (createdBy = user) + Restaurant (quán kèm theo) + Favorite (lượt lưu) + AuditLog
 * (lịch sử phản hồi) + SubmissionNote (ghi chú đính chính). Sửa / rút / gửi ghi chú:
 * lib/submissionWorkflow.ts.
 */

const DECISION_BY_ACTION: Record<string, ContributionFeedback["decision"]> = {
  approve_food: "approved",
  reject_food: "rejected",
  needs_revision: "needs_revision",
};

interface PopulatedRestaurant {
  _id: unknown;
  name: string;
  address: string;
  location?: { coordinates?: [number, number] };
  moderationStatus: ContributionStatus;
  moderationNote?: string;
  createdBy?: unknown;
}

/** Shape của Food sau `.lean()` + populate — model khai báo `models.Food ?? model(...)` nên TS không tự suy ra được. */
interface LeanFood {
  _id: unknown;
  name: string;
  description?: string;
  images?: string[];
  priceRange?: { min?: number; max?: number };
  eatingLevels?: Contribution["eatingLevels"];
  categoryIds?: { _id: unknown; name: string }[];
  restaurantId?: PopulatedRestaurant | null;
  moderationStatus: ContributionStatus;
  moderationNote?: string;
  visibility: string;
  claimedAt?: Date;
  editCount?: number;
  verification?: { verifiedBy?: { name?: string } | null; verifiedAt?: Date; note?: string };
  avgRating?: number;
  ratingCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function listContributionsForUser(userId: string): Promise<Contribution[]> {
  await connectDB();
  await releaseExpiredClaims();

  // visibility = deleted là soft-delete của Admin (BR-S05) — không hiện lại cho user.
  const foods = (await Food.find({ createdBy: userId, visibility: { $ne: "deleted" } })
    .sort({ createdAt: -1 })
    .populate("categoryIds", "name")
    .populate("restaurantId", "name address location moderationStatus moderationNote createdBy")
    .populate("verification.verifiedBy", "name")
    .lean()) as unknown as LeanFood[];
  if (foods.length === 0) return [];

  const foodIds = foods.map((food) => food._id);
  const ownedRestaurantIds = foods
    .map((food) => food.restaurantId)
    .filter((restaurant): restaurant is PopulatedRestaurant => Boolean(restaurant && String(restaurant.createdBy) === userId))
    .map((restaurant) => restaurant._id);

  const [saveGroups, logs, notes] = await Promise.all([
    Favorite.aggregate([{ $match: { foodId: { $in: foodIds } } }, { $group: { _id: "$foodId", count: { $sum: 1 } } }]),
    AuditLog.find({
      targetId: { $in: [...foodIds, ...ownedRestaurantIds] },
      action: { $in: Object.keys(DECISION_BY_ACTION) },
    })
      .sort({ createdAt: 1 })
      .lean(),
    SubmissionNote.find({ submissionId: { $in: foodIds }, authorId: userId }).sort({ createdAt: 1 }).lean(),
  ]);

  const notesByFood = new Map<string, SubmissionNoteItem[]>();
  for (const note of notes as unknown as { _id: unknown; submissionId: unknown; content: string; createdAt?: Date }[]) {
    const key = String(note.submissionId);
    const item = { id: String(note._id), content: note.content, createdAt: new Date(note.createdAt ?? Date.now()).toISOString() };
    notesByFood.set(key, [...(notesByFood.get(key) ?? []), item]);
  }

  const saveCountByFood = new Map<string, number>(
    saveGroups.map((group: { _id: unknown; count: number }) => [String(group._id), group.count]),
  );
  const feedbackByTarget = new Map<string, ContributionFeedback[]>();
  for (const log of logs) {
    const key = String(log.targetId);
    if (!DECISION_BY_ACTION[log.action]) continue;
    const entry: ContributionFeedback = {
      id: String(log._id),
      targetType: log.targetType === "restaurant" ? "restaurant" : "food",
      decision: DECISION_BY_ACTION[log.action],
      reason: log.reason ?? null,
      createdAt: new Date(log.createdAt ?? Date.now()).toISOString(),
    };
    feedbackByTarget.set(key, [...(feedbackByTarget.get(key) ?? []), entry]);
  }

  return foods.map((food): Contribution => {
    const restaurantDoc = food.restaurantId ?? null;
    const isOwnedRestaurant = Boolean(restaurantDoc && String(restaurantDoc.createdBy) === userId);
    const foodStatus = food.moderationStatus;
    const coordinates = restaurantDoc?.location?.coordinates;
    const verifier = food.verification?.verifiedBy;
    const permission = getEditPermission(foodStatus);
    const editsLeft = remainingEdits(foodStatus, food.editCount ?? 0);
    const hasEditsLeft = editsLeft === null || editsLeft > 0;

    const feedbackHistory = [
      ...(feedbackByTarget.get(String(food._id)) ?? []),
      ...(isOwnedRestaurant && restaurantDoc ? (feedbackByTarget.get(String(restaurantDoc._id)) ?? []) : []),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      id: String(food._id),
      name: food.name,
      description: food.description ?? "",
      images: food.images ?? [],
      priceMin: food.priceRange?.min ?? null,
      priceMax: food.priceRange?.max ?? null,
      eatingLevels: food.eatingLevels ?? [],
      categories: (food.categoryIds ?? []).map((category) => ({
        id: String(category._id),
        name: category.name,
      })),
      status: deriveContributionStatus(
        foodStatus,
        food.visibility,
        isOwnedRestaurant && restaurantDoc ? restaurantDoc.moderationStatus : null,
      ),
      foodStatus,
      moderationNote: food.moderationNote ?? null,
      restaurant: restaurantDoc
        ? {
            id: String(restaurantDoc._id),
            name: restaurantDoc.name,
            address: restaurantDoc.address,
            location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
            status: restaurantDoc.moderationStatus,
            moderationNote: restaurantDoc.moderationNote ?? null,
            isOwnedByUser: isOwnedRestaurant,
            canEditDetails: Boolean(permission.heavy && isOwnedRestaurant && restaurantDoc.moderationStatus === "pending"),
          }
        : null,
      verifiedByName: verifier?.name ?? null,
      verifiedAt: food.verification?.verifiedAt ? new Date(food.verification.verifiedAt).toISOString() : null,
      verificationNote: food.verification?.note ?? null,
      saveCount: saveCountByFood.get(String(food._id)) ?? 0,
      avgRating: food.avgRating ?? 0,
      ratingCount: food.ratingCount ?? 0,
      feedbackHistory,
      editable: { food: permission.light && hasEditsLeft, restaurant: permission.heavy && hasEditsLeft },
      remainingEdits: editsLeft,
      canWithdraw: foodStatus === "pending" || foodStatus === "in_review" || foodStatus === "needs_revision",
      canSendNote: foodStatus === "in_review" && !isClaimExpired(food.claimedAt),
      notes: notesByFood.get(String(food._id)) ?? [],
      createdAt: new Date(food.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(food.updatedAt ?? food.createdAt ?? Date.now()).toISOString(),
    };
  });
}

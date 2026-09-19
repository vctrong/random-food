import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { uploadImageFile } from "@/lib/cloudinary";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Favorite } from "@/lib/models/Favorite";
import { AuditLog } from "@/lib/models/AuditLog";
import { Category } from "@/lib/models/Category";
// Đăng ký model User để .populate("verification.verifiedBy") hoạt động.
import "@/lib/models/User";
import { isEatingLevel } from "@/constants/categories";
import { MAX_FOOD_IMAGES, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";
import { deriveContributionStatus } from "@/features/contributions/contributionLogic";
import type { Contribution, ContributionFeedback, ContributionStatus } from "@/types/contribution";

/**
 * Lớp dữ liệu cho trang "Món đã đóng góp" (UC-U11, UC-U12). Không có model DB
 * riêng — ghép từ Food (createdBy = user) + Restaurant (quán kèm theo) +
 * Favorite (lượt lưu) + AuditLog (lịch sử phản hồi của FoodReviewer).
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
  verification?: { verifiedBy?: { name?: string } | null; verifiedAt?: Date; note?: string };
  avgRating?: number;
  ratingCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function listContributionsForUser(userId: string): Promise<Contribution[]> {
  await connectDB();

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

  const [saveGroups, logs] = await Promise.all([
    Favorite.aggregate([{ $match: { foodId: { $in: foodIds } } }, { $group: { _id: "$foodId", count: { $sum: 1 } } }]),
    AuditLog.find({
      targetId: { $in: [...foodIds, ...ownedRestaurantIds] },
      action: { $in: Object.keys(DECISION_BY_ACTION) },
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const saveCountByFood = new Map<string, number>(
    saveGroups.map((group: { _id: unknown; count: number }) => [String(group._id), group.count]),
  );
  const feedbackByTarget = new Map<string, ContributionFeedback[]>();
  for (const log of logs) {
    const key = String(log.targetId);
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
          }
        : null,
      verifiedByName: verifier?.name ?? null,
      verifiedAt: food.verification?.verifiedAt ? new Date(food.verification.verifiedAt).toISOString() : null,
      verificationNote: food.verification?.note ?? null,
      saveCount: saveCountByFood.get(String(food._id)) ?? 0,
      avgRating: food.avgRating ?? 0,
      ratingCount: food.ratingCount ?? 0,
      feedbackHistory,
      editable: {
        food: foodStatus === "needs_revision",
        restaurant: Boolean(isOwnedRestaurant && restaurantDoc?.moderationStatus === "needs_revision"),
      },
      createdAt: new Date(food.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(food.updatedAt ?? food.createdAt ?? Date.now()).toISOString(),
    };
  });
}

export interface UpdateContributionInput {
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
  restaurant?: { name: string; address: string; lat: number; lng: number };
}

export type UpdateContributionError =
  | "INVALID_ID"
  | "NOT_FOUND"
  | "NOTHING_TO_UPDATE"
  | "NOT_EDITABLE"
  | "INVALID_FOOD"
  | "INVALID_PRICE"
  | "INVALID_CATEGORY"
  | "INVALID_EATING_LEVEL"
  | "INVALID_IMAGES"
  | "INVALID_RESTAURANT";

/**
 * UC-U12 / BR-U10: user sửa đóng góp của CHÍNH MÌNH khi đang `needs_revision`,
 * rồi gửi lại → `pending` để FoodReviewer duyệt lại (BR_UC mục 4). Mỗi phần
 * (món / quán kèm theo) chỉ sửa được khi phần đó đang `needs_revision`; user
 * không bao giờ tự đặt `approved` (BR-U09). Lý do phản hồi cũ vẫn còn trong
 * AuditLog nên xoá `moderationNote` khi nộp lại không làm mất lịch sử.
 */
export async function updateContribution(
  userId: string,
  foodId: string,
  input: UpdateContributionInput,
): Promise<{ error: UpdateContributionError | null }> {
  if (!isValidObjectId(foodId)) return { error: "INVALID_ID" };
  if (!input.food && !input.restaurant) return { error: "NOTHING_TO_UPDATE" };

  await connectDB();

  const food = await Food.findOne({ _id: foodId, createdBy: userId, visibility: { $ne: "deleted" } });
  if (!food) return { error: "NOT_FOUND" };

  const restaurant = await Restaurant.findById(food.restaurantId);
  const canEditFood = food.moderationStatus === "needs_revision";
  const canEditRestaurant = Boolean(
    restaurant && String(restaurant.createdBy) === userId && restaurant.moderationStatus === "needs_revision",
  );
  if ((input.food && !canEditFood) || (input.restaurant && !canEditRestaurant)) return { error: "NOT_EDITABLE" };

  // Kiểm tra phần quán trước khi upload ảnh để không tạo ảnh mồ côi trên Cloudinary khi input lỗi.
  if (input.restaurant) {
    const { name, address, lat, lng } = input.restaurant;
    const isValidCoordinate = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!name.trim() || !address.trim() || !isValidCoordinate) return { error: "INVALID_RESTAURANT" };
  }

  if (input.food) {
    const { name, description, priceMin, priceMax, categoryIds, eatingLevels, keepImages, newImages } = input.food;
    if (!name.trim() || !description.trim()) return { error: "INVALID_FOOD" };
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < priceMin) {
      return { error: "INVALID_PRICE" };
    }
    if (eatingLevels.length === 0 || eatingLevels.some((level) => !isEatingLevel(level))) {
      return { error: "INVALID_EATING_LEVEL" };
    }
    if (categoryIds.length === 0 || categoryIds.some((id) => !isValidObjectId(id))) return { error: "INVALID_CATEGORY" };
    const validCategoryCount = await Category.countDocuments({ _id: { $in: categoryIds }, isActive: true });
    if (validCategoryCount !== new Set(categoryIds).size) return { error: "INVALID_CATEGORY" };

    const currentImages = new Set<string>(food.images ?? []);
    const keptImages = keepImages.filter((url) => currentImages.has(url));
    const isValidUpload = (file: File) => file.type.startsWith("image/") && file.size > 0 && file.size <= MAX_FOOD_IMAGE_BYTES;
    const totalImages = keptImages.length + newImages.length;
    if (totalImages < 1 || totalImages > MAX_FOOD_IMAGES || !newImages.every(isValidUpload)) {
      return { error: "INVALID_IMAGES" };
    }

    const uploadedUrls = await Promise.all(newImages.map((file) => uploadImageFile(file, "nayangi/foods")));

    food.name = name.trim();
    food.description = description.trim();
    food.priceRange = { min: priceMin, max: priceMax };
    food.categoryIds = [...new Set(categoryIds)];
    food.eatingLevels = eatingLevels;
    food.images = [...keptImages, ...uploadedUrls];
    food.moderationStatus = "pending";
    food.moderationNote = undefined;
    food.updatedAt = new Date();
  }

  if (input.restaurant && restaurant) {
    const { name, address, lat, lng } = input.restaurant;

    restaurant.name = name.trim();
    restaurant.address = address.trim();
    restaurant.location = { type: "Point", coordinates: [lng, lat] };
    restaurant.moderationStatus = "pending";
    restaurant.moderationNote = undefined;
    restaurant.updatedAt = new Date();
  }

  if (input.food) await food.save();
  if (input.restaurant && restaurant) await restaurant.save();

  return { error: null };
}

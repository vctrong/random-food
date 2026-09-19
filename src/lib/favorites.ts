import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Favorite } from "@/lib/models/Favorite";
import { Food } from "@/lib/models/Food";
import { MAX_FAVORITES_PER_USER } from "@/constants/limits";

export interface FavoriteRecord {
  id: string;
  foodId: string;
  createdAt: string;
}

interface PopulatedFavoriteFood {
  _id: unknown;
}

/**
 * Danh sách favorites CỦA CHÍNH user — populate + match để tự động loại món đã
 * bị ẩn/từ chối/xoá sau khi user đã lưu (BR: chỉ tham chiếu món approved+visible).
 */
export async function listFavoritesForUser(userId: string): Promise<FavoriteRecord[]> {
  await connectDB();
  const favorites = await Favorite.find({ userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "foodId",
      match: { moderationStatus: "approved", visibility: "visible" },
      select: "_id",
    })
    .lean();

  return favorites
    .filter((favorite) => favorite.foodId !== null)
    .map((favorite) => ({
      id: String(favorite._id),
      foodId: String((favorite.foodId as unknown as PopulatedFavoriteFood)._id),
      createdAt: favorite.createdAt.toISOString(),
    }));
}

export type AddFavoriteError = "INVALID_FOOD" | "LIMIT_REACHED";

/** Idempotent: gọi lại với foodId đã lưu không lỗi, không tạo trùng (unique index + upsert). */
export async function addFavorite(userId: string, foodId: string): Promise<{ error?: AddFavoriteError }> {
  if (!isValidObjectId(foodId)) return { error: "INVALID_FOOD" };

  await connectDB();

  const food = (await Food.findOne({
    _id: foodId,
    moderationStatus: "approved",
    visibility: "visible",
  })
    .select("_id")
    .lean()) as { _id: unknown } | null;
  if (!food) return { error: "INVALID_FOOD" };

  const alreadySaved = await Favorite.exists({ userId, foodId });
  if (!alreadySaved) {
    const count = await Favorite.countDocuments({ userId });
    if (count >= MAX_FAVORITES_PER_USER) return { error: "LIMIT_REACHED" };
  }

  try {
    await Favorite.updateOne(
      { userId, foodId },
      { $setOnInsert: { userId, foodId, createdAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    // Race condition trên unique index (userId, foodId) — đã tồn tại, coi như thành công.
    if (!(err instanceof Error) || !err.message.includes("E11000")) throw err;
  }

  return {};
}

/** Idempotent: xoá cái không tồn tại vẫn coi như thành công. */
export async function removeFavorite(userId: string, foodId: string): Promise<void> {
  if (!isValidObjectId(foodId)) return;
  await connectDB();
  await Favorite.deleteOne({ userId, foodId });
}

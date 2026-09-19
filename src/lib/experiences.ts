import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Experience } from "@/lib/models/Experience";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";

export interface ExperienceRecord {
  id: string;
  foodId: string | null;
  restaurantId: string;
  createdAt: string;
}

export async function listExperiencesForUser(userId: string): Promise<ExperienceRecord[]> {
  await connectDB();
  const experiences = await Experience.find({ userId }).sort({ createdAt: -1 }).lean();

  return experiences.map((experience) => ({
    id: String(experience._id),
    foodId: experience.foodId ? String(experience.foodId) : null,
    restaurantId: String(experience.restaurantId),
    createdAt: experience.createdAt.toISOString(),
  }));
}

export type AddExperienceError = "INVALID_RESTAURANT" | "INVALID_FOOD" | "FOOD_RESTAURANT_MISMATCH";

/**
 * Ghi nhận 1 lượt check-in mới — KHÔNG giới hạn số lần lặp lại cho cùng
 * món/quán (theo xác nhận của Ttong), mỗi lần "chốt ăn" luôn tạo record mới.
 */
export async function addExperience(
  userId: string,
  input: { restaurantId: string; foodId?: string | null },
): Promise<{ error?: AddExperienceError; id?: string }> {
  const restaurantId = input.restaurantId;
  const foodId = input.foodId ?? null;

  if (!isValidObjectId(restaurantId)) return { error: "INVALID_RESTAURANT" };
  if (foodId && !isValidObjectId(foodId)) return { error: "INVALID_FOOD" };

  await connectDB();

  const restaurant = (await Restaurant.findOne({
    _id: restaurantId,
    moderationStatus: "approved",
    visibility: "visible",
  })
    .select("_id")
    .lean()) as { _id: unknown } | null;
  if (!restaurant) return { error: "INVALID_RESTAURANT" };

  if (foodId) {
    const food = (await Food.findOne({
      _id: foodId,
      restaurantId,
      moderationStatus: "approved",
      visibility: "visible",
    })
      .select("_id")
      .lean()) as { _id: unknown } | null;
    if (!food) return { error: "FOOD_RESTAURANT_MISMATCH" };
  }

  const experience = await Experience.create({
    userId,
    restaurantId,
    ...(foodId && { foodId }),
  });

  return { id: String(experience._id) };
}

/** Idempotent: xoá cái không tồn tại/không phải của mình vẫn coi như thành công. */
export async function removeExperience(userId: string, id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  await Experience.deleteOne({ _id: id, userId });
}

import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Review } from "@/lib/models/Review";
import { Experience } from "@/lib/models/Experience";
import { Food } from "@/lib/models/Food";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/limits";

export interface ReviewRecord {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
}

interface PopulatedReviewUser {
  name?: string;
  avatarUrl?: string;
}

/** Danh sách review công khai của 1 món — chỉ status "visible", không lộ email/id nội bộ tác giả. */
export async function listReviewsForFood(
  foodId: string,
  { page = 1, limit = DEFAULT_PAGE_SIZE }: { page?: number; limit?: number } = {},
): Promise<{ items: ReviewRecord[]; total: number }> {
  if (!isValidObjectId(foodId)) return { items: [], total: 0 };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
  const safePage = Math.max(Math.trunc(page), 1);

  await connectDB();
  const filter = { foodId, status: "visible" };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate("userId", "name avatarUrl")
      .lean(),
    Review.countDocuments(filter),
  ]);

  return {
    items: (reviews as unknown as {
      _id: unknown;
      rating: number;
      comment?: string;
      createdAt: Date;
      userId: PopulatedReviewUser | null;
    }[]).map((review) => ({
      id: String(review._id),
      rating: review.rating,
      comment: review.comment ?? null,
      createdAt: review.createdAt.toISOString(),
      user: {
        name: review.userId?.name ?? "Người dùng đã xoá",
        avatarUrl: review.userId?.avatarUrl ?? null,
      },
    })),
    total,
  };
}

export interface MyReviewSummary {
  id: string;
  foodId: string;
  rating: number;
  comment: string | null;
}

/** Review CỦA CHÍNH user, map theo foodId — dùng ở trang Lịch sử để biết món nào đã đánh giá rồi. */
export async function listMyReviewsByFood(userId: string): Promise<Map<string, MyReviewSummary>> {
  await connectDB();
  const reviews = (await Review.find({ userId }).select("foodId rating comment").lean()) as unknown as {
    _id: unknown;
    foodId: unknown;
    rating: number;
    comment?: string;
  }[];

  return new Map(
    reviews.map((review) => [
      String(review.foodId),
      {
        id: String(review._id),
        foodId: String(review.foodId),
        rating: review.rating,
        comment: review.comment ?? null,
      },
    ]),
  );
}

export type CreateReviewError =
  | "INVALID_EXPERIENCE"
  | "EXPERIENCE_NOT_OWNED"
  | "EXPERIENCE_MISSING_FOOD"
  | "FOOD_NOT_AVAILABLE"
  | "ALREADY_REVIEWED";

/**
 * Tạo review mới — BẮT BUỘC gắn với 1 Experience (check-in) CỦA CHÍNH user
 * (schema Review.experienceId required). Không giới hạn tự-review nội dung
 * mình đóng góp (đã xác nhận với Ttong). Chỉ 1 review / user / (food+restaurant)
 * — ép bởi unique index, race condition bắt qua E11000.
 */
export async function createReview(
  userId: string,
  input: { experienceId: string; rating: number; comment?: string },
): Promise<{ error?: CreateReviewError; id?: string }> {
  const { experienceId, rating, comment } = input;
  if (!isValidObjectId(experienceId)) return { error: "INVALID_EXPERIENCE" };

  await connectDB();

  const experience = (await Experience.findOne({ _id: experienceId, userId }).lean()) as {
    foodId?: unknown;
  } | null;
  if (!experience) return { error: "EXPERIENCE_NOT_OWNED" };
  if (!experience.foodId) return { error: "EXPERIENCE_MISSING_FOOD" };

  const food = (await Food.findOne({
    _id: experience.foodId,
    moderationStatus: "approved",
    visibility: "visible",
  })
    .select("_id restaurantId")
    .lean()) as { _id: unknown; restaurantId: unknown } | null;
  if (!food) return { error: "FOOD_NOT_AVAILABLE" };

  try {
    const review = await Review.create({
      userId,
      foodId: food._id,
      restaurantId: food.restaurantId,
      experienceId,
      rating,
      ...(comment && { comment }),
    });
    await recalculateFoodRating(String(food._id));
    return { id: String(review._id) };
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) return { error: "ALREADY_REVIEWED" };
    throw err;
  }
}

/** Idempotent: xoá cái không tồn tại/không phải của mình vẫn coi như thành công. */
export async function deleteReview(userId: string, id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDB();
  const review = (await Review.findOneAndDelete({ _id: id, userId }).lean()) as { foodId?: unknown } | null;
  if (review?.foodId) await recalculateFoodRating(String(review.foodId));
}

/** Tính lại avgRating/ratingCount của Food từ các review "visible" thật — dùng sau mọi create/delete/đổi status. */
export async function recalculateFoodRating(foodId: string): Promise<void> {
  await connectDB();
  const [agg] = await Review.aggregate([
    { $match: { foodId: new Types.ObjectId(foodId), status: "visible" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await Food.updateOne(
    { _id: foodId },
    {
      $set: {
        avgRating: agg ? Math.round(agg.avgRating * 10) / 10 : 0,
        ratingCount: agg ? agg.count : 0,
      },
    },
  );
}

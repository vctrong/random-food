import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Log } from "@/lib/models/Log";
import { Review } from "@/lib/models/Review";

const RANDOM_LOG_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LandingStats {
  foodCount: number;
  restaurantCount: number;
  /** Số lượt random (Log action "random") trong 90 ngày gần nhất. */
  randomCount90d: number;
}

/** Số liệu thật cho landing — chỉ đếm món/quán đã duyệt và đang công khai (BR-R03). */
export async function getLandingStats(now: Date = new Date()): Promise<LandingStats> {
  await connectDB();
  const windowStart = new Date(now.getTime() - RANDOM_LOG_WINDOW_DAYS * DAY_MS);
  const [foodCount, restaurantCount, randomCount90d] = await Promise.all([
    Food.countDocuments({ moderationStatus: "approved", visibility: "visible" }),
    Restaurant.countDocuments({ moderationStatus: "approved", visibility: "visible" }),
    Log.countDocuments({ action: "random", createdAt: { $gte: windowStart } }),
  ]);
  return { foodCount, restaurantCount, randomCount90d };
}

/**
 * Comment review THẬT mới nhất (đang hiển thị, có nội dung) của từng món — dùng
 * làm câu trích trên thẻ polaroid. Món chưa có review có comment thì không có key.
 */
export async function getLatestReviewQuotes(foodIds: string[]): Promise<Record<string, string>> {
  if (foodIds.length === 0) return {};
  await connectDB();
  const reviews = (await Review.find({
    foodId: { $in: foodIds },
    status: "visible",
    comment: { $exists: true, $nin: ["", null] },
  })
    .sort({ createdAt: -1 })
    .select("foodId comment")
    .lean()) as unknown as { foodId: unknown; comment?: string }[];

  const quotes: Record<string, string> = {};
  for (const review of reviews) {
    const foodId = String(review.foodId);
    const comment = review.comment?.trim();
    if (comment && !quotes[foodId]) quotes[foodId] = comment;
  }
  return quotes;
}

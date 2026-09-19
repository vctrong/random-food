import { connectDB } from "@/lib/mongodb";
import { Review } from "@/lib/models/Review";
import { AuditLog } from "@/lib/models/AuditLog";
import { recalculateFoodRating } from "@/lib/reviews";
import type { AdminReviewRow } from "@/types/admin";

export async function getReviews(statusFilter?: "visible" | "hidden"): Promise<AdminReviewRow[]> {
  await connectDB();
  const query = statusFilter ? { status: statusFilter } : {};

  const reviews = await Review.find(query)
    .sort({ createdAt: -1 })
    .populate("userId", "name avatarUrl")
    .populate("foodId", "name")
    .populate("restaurantId", "name")
    .lean();

  return reviews.map((review) => {
    const user = review.userId as unknown as { _id?: unknown; name?: string; avatarUrl?: string } | null;
    const food = review.foodId as unknown as { name?: string } | null;
    const restaurant = review.restaurantId as unknown as { name?: string } | null;
    return {
      id: String(review._id),
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status as "visible" | "hidden",
      user: { id: String(user?._id ?? ""), name: user?.name ?? "Người dùng đã xoá", avatarUrl: user?.avatarUrl ?? null },
      foodName: food?.name ?? null,
      restaurantName: restaurant?.name ?? null,
      createdAt: (review.createdAt ?? new Date()).toISOString(),
    };
  });
}

type ReviewStatusError = "NOT_FOUND";

export async function setReviewStatus({
  adminId,
  reviewId,
  status,
}: {
  adminId: string;
  reviewId: string;
  status: "visible" | "hidden";
}): Promise<{ error: ReviewStatusError | null }> {
  await connectDB();
  const review = await Review.findById(reviewId);
  if (!review) return { error: "NOT_FOUND" };

  review.status = status;
  review.updatedAt = new Date();
  await review.save();
  // Ẩn/hiện review làm thay đổi tập "visible" dùng để tính avgRating/ratingCount của Food.
  await recalculateFoodRating(String(review.foodId));

  await AuditLog.create({
    actorId: adminId,
    action: "hide_review",
    targetType: "review",
    targetId: reviewId,
    reason: `Đổi trạng thái sang "${status}"`,
  });

  return { error: null };
}

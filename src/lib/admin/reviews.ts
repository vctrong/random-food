import { connectDB } from "@/lib/mongodb";
import { Review } from "@/lib/models/Review";
import { AuditLog } from "@/lib/models/AuditLog";
import { recalculateFoodRating } from "@/lib/reviews";
import { notify } from "@/lib/notifications/notify";
import type { AdminReviewRow } from "@/types/admin";

export async function getReviews(statusFilter?: "visible" | "hidden"): Promise<AdminReviewRow[]> {
  await connectDB();
  // Review user đã tự xoá (xoá mềm) không còn là nội dung cần kiểm duyệt.
  const query = statusFilter ? { status: statusFilter, deletedAt: null } : { deletedAt: null };

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
  reason,
}: {
  adminId: string;
  reviewId: string;
  status: "visible" | "hidden";
  /** Bắt buộc khi ẩn (route kiểm) — ghi AuditLog + gửi kèm thông báo. */
  reason?: string;
}): Promise<{ error: ReviewStatusError | null }> {
  await connectDB();
  const review = await Review.findById(reviewId).populate("foodId", "name");
  if (!review) return { error: "NOT_FOUND" };

  const wasShown = review.status !== "hidden";
  review.status = status;
  review.updatedAt = new Date();
  await review.save();
  // Ẩn/hiện review làm thay đổi tập "visible" dùng để tính avgRating/ratingCount của Food.
  const food = review.foodId as unknown as { _id: unknown; name?: string } | null;
  if (food?._id) await recalculateFoodRating(String(food._id));

  await AuditLog.create({
    actorId: adminId,
    action: "hide_review",
    targetType: "review",
    targetId: reviewId,
    reason: reason?.trim() || `Đổi trạng thái sang "${status}"`,
  });

  if (wasShown && status === "hidden") {
    await notify(String(review.userId), {
      type: "content_removed",
      payload: {
        targetType: "review",
        targetId: reviewId,
        name: food?.name ?? "",
        ...(reason?.trim() && { reason: reason.trim() }),
      },
      actorId: adminId,
    });
  }

  return { error: null };
}

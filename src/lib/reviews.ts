import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Review } from "@/lib/models/Review";
import { Experience } from "@/lib/models/Experience";
import { Food } from "@/lib/models/Food";
import { Report } from "@/lib/models/Report";
import "@/lib/models/ReportCase";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/limits";
import { getCreateReviewRemainingMs, getEditReviewRemainingMs } from "@/lib/reviewWindow";

export interface ReviewRecord {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
  /** Đánh giá của chính người đang xem — không hiện "Báo cáo đánh giá". */
  isMine: boolean;
  /** Người đang xem đã báo cáo đánh giá này (UI thu gọn thành "Bạn đã báo cáo · Hoàn tác"). */
  reportedByMe: boolean;
  canUndoReport: boolean;
}

interface PopulatedReviewUser {
  _id?: unknown;
  name?: string;
  avatarUrl?: string;
}

/**
 * Danh sách review công khai của 1 món — chỉ status "visible" và chưa bị xoá mềm,
 * không lộ email/id nội bộ tác giả. Có `viewerId`: thêm cờ của-mình/đã-báo-cáo, và
 * vẫn trả đánh giá đang ẩn tạm mà CHÍNH người xem đã báo cáo (để còn nút Hoàn tác).
 */
export async function listReviewsForFood(
  foodId: string,
  { page = 1, limit = DEFAULT_PAGE_SIZE, viewerId = null }: { page?: number; limit?: number; viewerId?: string | null } = {},
): Promise<{ items: ReviewRecord[]; total: number }> {
  if (!isValidObjectId(foodId)) return { items: [], total: 0 };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
  const safePage = Math.max(Math.trunc(page), 1);

  await connectDB();

  const myReports = viewerId
    ? ((await Report.find({ reporterId: viewerId, targetType: "review" })
        .select("targetId caseId")
        .populate("caseId", "status")
        .lean()) as unknown as { targetId: unknown; caseId?: { status?: string } | null }[])
    : [];
  const reportState = new Map(myReports.map((report) => [String(report.targetId), report.caseId?.status === "pending"]));

  const filter = {
    foodId,
    deletedAt: null,
    $or: [
      { status: "visible" },
      { status: "hidden_pending_review", _id: { $in: myReports.map((report) => report.targetId) } },
    ],
  };
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
    }[]).map((review) => {
      const id = String(review._id);
      return {
        id,
        rating: review.rating,
        comment: review.comment ?? null,
        createdAt: review.createdAt.toISOString(),
        user: {
          name: review.userId?.name ?? "Người dùng đã xoá",
          avatarUrl: review.userId?.avatarUrl ?? null,
        },
        isMine: Boolean(viewerId && review.userId?._id && String(review.userId._id) === viewerId),
        reportedByMe: reportState.has(id),
        canUndoReport: reportState.get(id) ?? false,
      };
    }),
    total,
  };
}

export interface MyReviewSummary {
  id: string;
  foodId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Đã bị xoá mềm (xoá sau 24h) — không hiển thị nội dung, chỉ để UI báo "không thể đánh giá lại". */
  isDeleted: boolean;
}

/**
 * Review CỦA CHÍNH user, map theo foodId — dùng ở trang Lịch sử để biết món nào
 * đã đánh giá rồi, còn sửa được không (createdAt) và đã bị xoá mềm chưa.
 */
export async function listMyReviewsByFood(userId: string): Promise<Map<string, MyReviewSummary>> {
  await connectDB();
  const reviews = (await Review.find({ userId })
    .select("foodId rating comment createdAt deletedAt")
    .lean()) as unknown as {
    _id: unknown;
    foodId: unknown;
    rating: number;
    comment?: string;
    createdAt: Date;
    deletedAt?: Date | null;
  }[];

  return new Map(
    reviews.map((review) => [
      String(review.foodId),
      {
        id: String(review._id),
        foodId: String(review.foodId),
        rating: review.rating,
        comment: review.comment ?? null,
        createdAt: review.createdAt.toISOString(),
        isDeleted: Boolean(review.deletedAt),
      },
    ]),
  );
}

export type CreateReviewError =
  | "INVALID_EXPERIENCE"
  | "EXPERIENCE_NOT_OWNED"
  | "EXPERIENCE_MISSING_FOOD"
  | "FOOD_NOT_AVAILABLE"
  | "REVIEW_WINDOW_EXPIRED"
  | "REVIEW_DELETED_LOCKED"
  | "ALREADY_REVIEWED";

/**
 * Tạo review mới — BẮT BUỘC gắn với 1 Experience (check-in) CỦA CHÍNH user
 * (schema Review.experienceId required). Không giới hạn tự-review nội dung
 * mình đóng góp (đã xác nhận với Ttong). Chỉ 1 review / user / (food+restaurant)
 * — ép bởi unique index, race condition bắt qua E11000. Chỉ được viết trong 72h
 * kể từ lần check-in đó (BR-RV10); review từng bị xoá mềm thì khoá vĩnh viễn (BR-RV11).
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
    createdAt: Date;
  } | null;
  if (!experience) return { error: "EXPERIENCE_NOT_OWNED" };
  if (!experience.foodId) return { error: "EXPERIENCE_MISSING_FOOD" };
  if (getCreateReviewRemainingMs(experience.createdAt) === 0) return { error: "REVIEW_WINDOW_EXPIRED" };

  const food = (await Food.findOne({
    _id: experience.foodId,
    moderationStatus: "approved",
    visibility: "visible",
  })
    .select("_id restaurantId")
    .lean()) as { _id: unknown; restaurantId: unknown } | null;
  if (!food) return { error: "FOOD_NOT_AVAILABLE" };

  const existing = (await Review.findOne({ userId, foodId: food._id, restaurantId: food.restaurantId })
    .select("deletedAt")
    .lean()) as { deletedAt?: Date | null } | null;
  if (existing) return { error: existing.deletedAt ? "REVIEW_DELETED_LOCKED" : "ALREADY_REVIEWED" };

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

export type UpdateReviewError = "NOT_FOUND" | "EDIT_WINDOW_EXPIRED";

/** Sửa review của chính mình — chỉ trong 24h kể từ lúc tạo (BR-RV09). Comment rỗng = bỏ comment. */
export async function updateReview(
  userId: string,
  id: string,
  input: { rating: number; comment?: string },
): Promise<{ error?: UpdateReviewError }> {
  if (!isValidObjectId(id)) return { error: "NOT_FOUND" };
  await connectDB();

  const review = (await Review.findOne({ _id: id, userId, deletedAt: null })
    .select("foodId createdAt")
    .lean()) as { foodId: unknown; createdAt: Date } | null;
  if (!review) return { error: "NOT_FOUND" };
  if (getEditReviewRemainingMs(review.createdAt) === 0) return { error: "EDIT_WINDOW_EXPIRED" };

  const { rating, comment } = input;
  await Review.updateOne(
    { _id: id, userId },
    comment
      ? { $set: { rating, comment, updatedAt: new Date() } }
      : { $set: { rating, updatedAt: new Date() }, $unset: { comment: "" } },
  );
  await recalculateFoodRating(String(review.foodId));
  return {};
}

/**
 * Xoá review của chính mình. Trong 24h đầu: xoá thật (vẫn viết lại được nếu còn
 * trong 72h kể từ 1 lần check-in). Sau 24h: xoá mềm (`deletedAt`) — biến mất
 * khỏi mọi nơi nhưng giữ bản ghi để không thể đánh giá lại (BR-RV11).
 * Idempotent: xoá cái không tồn tại/không phải của mình vẫn coi như thành công.
 * `locked = true` nghĩa là sau lần xoá này user không thể đánh giá lại món đó.
 */
export async function deleteReview(userId: string, id: string): Promise<{ locked: boolean }> {
  if (!isValidObjectId(id)) return { locked: false };
  await connectDB();

  const review = (await Review.findOne({ _id: id, userId })
    .select("foodId createdAt deletedAt")
    .lean()) as { foodId: unknown; createdAt: Date; deletedAt?: Date | null } | null;
  if (!review) return { locked: false };
  if (review.deletedAt) return { locked: true };

  const locked = getEditReviewRemainingMs(review.createdAt) === 0;
  if (locked) {
    await Review.updateOne({ _id: id, userId }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
  } else {
    await Review.deleteOne({ _id: id, userId });
  }
  await recalculateFoodRating(String(review.foodId));
  return { locked };
}

/** Tính lại avgRating/ratingCount của Food từ các review "visible" chưa bị xoá mềm — dùng sau mọi create/update/delete/đổi status. */
export async function recalculateFoodRating(foodId: string): Promise<void> {
  await connectDB();
  const [agg] = await Review.aggregate([
    { $match: { foodId: new Types.ObjectId(foodId), status: "visible", deletedAt: null } },
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

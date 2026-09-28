import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { createReview, listReviewsForFood } from "@/lib/reviews";
import {
  MAX_PAGE_SIZE,
  MAX_REVIEW_COMMENT_LENGTH,
  REVIEW_CREATE_WINDOW_HOURS,
  REVIEW_EDIT_WINDOW_HOURS,
} from "@/constants/limits";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EXPERIENCE: "Lượt check-in không hợp lệ.",
  EXPERIENCE_NOT_OWNED: "Không tìm thấy lượt check-in này.",
  EXPERIENCE_MISSING_FOOD: "Lượt check-in này chưa gắn với món ăn cụ thể, không thể đánh giá.",
  FOOD_NOT_AVAILABLE: "Món ăn không còn khả dụng để đánh giá.",
  REVIEW_WINDOW_EXPIRED: `Đã quá ${REVIEW_CREATE_WINDOW_HOURS} giờ kể từ lúc ăn nên không thể đánh giá lần ăn này nữa.`,
  REVIEW_DELETED_LOCKED: `Bạn đã xoá đánh giá món này sau ${REVIEW_EDIT_WINDOW_HOURS} giờ nên không thể đánh giá lại.`,
  ALREADY_REVIEWED: "Bạn đã đánh giá món này rồi.",
};

const ERROR_STATUS: Record<string, number> = {
  REVIEW_WINDOW_EXPIRED: 403,
  REVIEW_DELETED_LOCKED: 409,
  ALREADY_REVIEWED: 409,
};

/** Danh sách review công khai của 1 món — GET /api/reviews?foodId=... */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const foodId = searchParams.get("foodId");
  if (!foodId) return NextResponse.json({ error: "Thiếu foodId." }, { status: 400 });

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? String(MAX_PAGE_SIZE));

  const auth = await requireAuth();
  const result = await listReviewsForFood(foodId, {
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : MAX_PAGE_SIZE,
    viewerId: auth.ok ? auth.id : null,
  });

  return NextResponse.json(result);
}

const postSchema = z
  .object({
    experienceId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(MAX_REVIEW_COMMENT_LENGTH).optional(),
  })
  .strict();

/**
 * Tạo review mới — bắt buộc gắn với 1 Experience của chính user (schema đã ép),
 * hiển thị công khai ngay (không cần duyệt trước), xử lý vi phạm qua báo cáo (/api/reports).
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu hoặc sai experienceId/rating/comment." }, { status: 400 });
  }

  const result = await createReview(auth.id, parsed.data);
  if (result.error) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: ERROR_STATUS[result.error] ?? 400 });
  }

  return NextResponse.json({ success: true, id: result.id }, { status: 201 });
}

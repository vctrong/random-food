import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { deleteReview, updateReview } from "@/lib/reviews";
import { MAX_REVIEW_COMMENT_LENGTH, REVIEW_EDIT_WINDOW_HOURS } from "@/constants/limits";

const patchSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(MAX_REVIEW_COMMENT_LENGTH).optional(),
  })
  .strict();

/** Sửa review của chính mình — chỉ trong 24h kể từ lúc tạo (BR-RV09). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu hoặc sai rating/comment." }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateReview(auth.id, id, parsed.data);
  if (result.error === "NOT_FOUND") {
    return NextResponse.json({ error: "Không tìm thấy đánh giá này." }, { status: 404 });
  }
  if (result.error === "EDIT_WINDOW_EXPIRED") {
    return NextResponse.json(
      { error: `Đã quá ${REVIEW_EDIT_WINDOW_HOURS} giờ kể từ lúc đánh giá nên không thể sửa nữa.` },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * Idempotent: xoá id không tồn tại/không phải của mình vẫn trả thành công.
 * `locked: true` = review đã quá 24h nên bị xoá mềm, user không thể đánh giá lại món này.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  const { locked } = await deleteReview(auth.id, id);

  return NextResponse.json({ success: true, locked });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { listMyReviewsByFood } from "@/lib/reviews";

/** Review CỦA CHÍNH user hiện tại — dùng ở trang Lịch sử để biết món nào đã đánh giá rồi. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const reviewsByFood = await listMyReviewsByFood(auth.id);
  return NextResponse.json([...reviewsByFood.values()]);
}

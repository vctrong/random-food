import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { addExperience, listExperiencesForUser } from "@/lib/experiences";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_RESTAURANT: "Quán ăn không hợp lệ hoặc chưa được duyệt.",
  INVALID_FOOD: "Món ăn không hợp lệ hoặc chưa được duyệt.",
  FOOD_RESTAURANT_MISMATCH: "Món ăn này không thuộc quán đã chọn.",
};

/** Lịch sử check-in thật của user hiện tại. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const experiences = await listExperiencesForUser(auth.id);
  return NextResponse.json(experiences);
}

const postSchema = z
  .object({
    restaurantId: z.string().min(1),
    foodId: z.string().min(1).optional(),
  })
  .strict();

/**
 * Ghi nhận 1 lượt "chốt ăn" mới — không giới hạn lặp lại cho cùng món/quán
 * (đã xác nhận với Ttong). eatenAt lấy từ createdAt do server đặt, không nhận từ client.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu hoặc sai restaurantId/foodId." }, { status: 400 });
  }

  const result = await addExperience(auth.id, parsed.data);
  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });

  return NextResponse.json({ success: true, id: result.id }, { status: 201 });
}

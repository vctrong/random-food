import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { addFavorite, listFavoritesForUser } from "@/lib/favorites";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FOOD: "Món ăn không hợp lệ hoặc chưa được duyệt.",
  LIMIT_REACHED: "Bạn đã lưu tối đa số món yêu thích cho phép.",
};

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const favorites = await listFavoritesForUser(auth.id);
  return NextResponse.json(favorites);
}

const postSchema = z.object({ foodId: z.string().min(1) }).strict();

/** Idempotent: gọi lại với cùng foodId không lỗi, không tạo trùng (unique index + upsert). */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Thiếu hoặc sai foodId." }, { status: 400 });

  const result = await addFavorite(auth.id, parsed.data.foodId);
  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });

  return NextResponse.json({ success: true }, { status: 201 });
}

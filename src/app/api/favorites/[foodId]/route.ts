import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { removeFavorite } from "@/lib/favorites";

/** Idempotent: xoá foodId chưa từng lưu vẫn trả thành công. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ foodId: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { foodId } = await params;
  await removeFavorite(auth.id, foodId);

  return NextResponse.json({ success: true });
}

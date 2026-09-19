import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { deleteReview } from "@/lib/reviews";

/** Idempotent: xoá id không tồn tại/không phải của mình vẫn trả thành công. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  await deleteReview(auth.id, id);

  return NextResponse.json({ success: true });
}

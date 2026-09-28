import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { discardAnnouncementImage } from "@/lib/announcements";

/** Xoá ảnh vừa upload nhưng Admin bỏ đi khi đang soạn (chưa từng nằm trong bản đã lưu). */
export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const result = await discardAnnouncementImage(body?.url);
  if (result === "invalid") return NextResponse.json({ error: "Ảnh không hợp lệ." }, { status: 400 });
  // Ảnh đã nằm trong bài đã lưu → giữ nguyên, lưu bài sẽ tự xử lý (gắn lại tag).
  if (result === "in_use") return NextResponse.json({ ok: true, deleted: false });
  return NextResponse.json({ ok: true, deleted: result === "deleted" });
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { markAllAnnouncementsRead, markAnnouncementRead } from "@/lib/announcements";

const bodySchema = z.object({ id: z.string().refine((value) => isValidObjectId(value)).optional() }).strict();

/**
 * Đánh dấu đã đọc thông báo chính thức. `{ id }` = chỉ bài vừa bấm/mở;
 * không có body = "Đánh dấu đã đọc hết".
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const raw = await request.text();
  let body: unknown = {};
  try {
    if (raw) body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  if (parsed.data.id) {
    const ok = await markAnnouncementRead(auth.id, parsed.data.id);
    if (!ok) return NextResponse.json({ error: "Không tìm thấy thông báo." }, { status: 404 });
  } else {
    await markAllAnnouncementsRead(auth.id);
  }
  return NextResponse.json({ ok: true });
}

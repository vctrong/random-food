import { NextResponse } from "next/server";
import { z } from "zod";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { reopenRestaurant } from "@/lib/admin/reportCases";

const bodySchema = z.object({ restaurantId: z.string(), businessStatus: z.literal("open"), note: z.string().max(500).default("") });

/** Admin mở lại quán đã đánh dấu đóng cửa (có AuditLog `restaurant_reopen`). */
export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const result = await reopenRestaurant(admin.id, parsed.data.restaurantId, parsed.data.note);
  if (result.error) return NextResponse.json({ error: "Không tìm thấy quán đang đóng cửa." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

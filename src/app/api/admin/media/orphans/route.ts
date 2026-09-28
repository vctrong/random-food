import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { listOrphanImages } from "@/lib/media/cleanupService";
import { DEFAULT_ORPHAN_DAYS } from "@/lib/media/cleanupRules";

export const dynamic = "force-dynamic";

/** Danh sách ảnh rác hiện tại (Cloudinary Search API). */
export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  try {
    const { images, truncated } = await listOrphanImages({ days: DEFAULT_ORPHAN_DAYS });
    return NextResponse.json({ images, truncated, days: DEFAULT_ORPHAN_DAYS });
  } catch (error) {
    console.error("[media] list orphans failed", error);
    return NextResponse.json({ error: "Không đọc được danh sách ảnh từ Cloudinary, thử lại sau." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { runManualCleanupBatch } from "@/lib/media/cleanupService";
import { CLEANUP_BATCH_SIZE, MEDIA_ROOT_FOLDER } from "@/lib/media/cleanupRules";

// Mỗi request tự dừng sau ~15 giây (lib/media/cleanupService.ts); 60 là mức tối đa hợp lệ
// trên Vercel Hobby dù bật hay tắt Fluid compute — chỉ là lưới an toàn.
export const maxDuration = 60;

const PUBLIC_ID_PATTERN = new RegExp(`^${MEDIA_ROOT_FOLDER}/[\\w\\-/]+$`);

const bodySchema = z
  .object({
    runId: z.string().refine(isValidObjectId).nullable().optional(),
    publicIds: z
      .array(z.string().regex(PUBLIC_ID_PATTERN))
      .min(1)
      .max(CLEANUP_BATCH_SIZE)
      .optional(),
    all: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Boolean(body.all) !== Boolean(body.publicIds), { message: "Chọn ảnh cụ thể HOẶC dọn tất cả." });

/** 1 lượt dọn ảnh rác từ trang Admin (xem runManualCleanupBatch). */
export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Yêu cầu dọn ảnh không hợp lệ." }, { status: 400 });
  const { runId = null, publicIds = null, all = false } = parsed.data;

  try {
    const result = await runManualCleanupBatch({ adminId: admin.id, runId, publicIds, all });
    if (result.error) return NextResponse.json({ error: "Không tìm thấy lần dọn này." }, { status: 404 });
    return NextResponse.json({ runId: result.runId, ...result.outcome });
  } catch (error) {
    console.error("[media] cleanup failed", error);
    return NextResponse.json({ error: "Dọn ảnh thất bại (Cloudinary hoặc DB lỗi), thử lại sau." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getReportCaseDetail, resolveReportCase, type ResolveCaseError } from "@/lib/admin/reportCases";

const note = z.string().trim().min(1).max(500);
const location = z.object({ lat: z.number(), lng: z.number() }).nullable();

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss"), note }),
  z.object({ action: z.literal("remove_review"), note }),
  z.object({ action: z.literal("remove_review_warn"), note }),
  z.object({
    action: z.literal("edit_info"),
    note,
    food: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        priceMin: z.number().int().optional(),
        priceMax: z.number().int().optional(),
        removeImages: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    restaurant: z
      .object({
        name: z.string().optional(),
        address: z.string().optional(),
        location: location.optional(),
        openingHours: z.string().optional(),
        removeImages: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
  }),
  z.object({ action: z.literal("mark_closed"), note }),
  // Gộp quán không hoàn tác được — client phải gửi confirm: true sau bước xác nhận thứ 2.
  z.object({ action: z.literal("merge_restaurant"), note, mergeIntoRestaurantId: z.string(), confirm: z.literal(true) }),
]);

const ERRORS: Record<ResolveCaseError, { message: string; status: number }> = {
  NOT_FOUND: { message: "Không tìm thấy case.", status: 404 },
  NOT_PENDING: { message: "Case này đã được xử lý trước đó.", status: 409 },
  NOTE_REQUIRED: { message: "Cần ghi lý do xử lý.", status: 400 },
  ACTION_NOT_ALLOWED: { message: "Hành động không áp dụng cho loại nội dung này.", status: 400 },
  TARGET_MISSING: { message: "Nội dung bị báo cáo không còn tồn tại.", status: 404 },
  INVALID_EDIT: { message: "Thông tin sửa chưa hợp lệ hoặc chưa có thay đổi nào.", status: 400 },
  INVALID_MERGE_TARGET: { message: "Quán gốc để gộp không hợp lệ.", status: 400 },
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  const detail = await getReportCaseDetail((await params).id);
  if (!detail) return NextResponse.json({ error: "Không tìm thấy case." }, { status: 404 });
  return NextResponse.json(detail);
}

/** Xử lý case — CHỈ Admin (BR-A09, BR-M10). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu xử lý chưa hợp lệ." }, { status: 400 });

  const result = await resolveReportCase(admin.id, (await params).id, parsed.data);
  if (result.error) {
    const { message, status } = ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

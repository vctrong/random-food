import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { getMyReportStates, submitReport, undoReport, type SubmitReportError } from "@/lib/reports";
import { MAX_REPORT_NOTE_LENGTH, MAX_REPORTS_PER_DAY, REPORT_REASON_IDS, type ReportReason } from "@/constants/reports";

const TARGET_TYPES = ["review", "food", "restaurant"] as const;

const postSchema = z
  .object({
    targetType: z.enum(TARGET_TYPES),
    targetId: z.string().min(1),
    reason: z.enum(REPORT_REASON_IDS as [ReportReason, ...ReportReason[]]),
    note: z.string().trim().max(MAX_REPORT_NOTE_LENGTH).optional(),
    duplicateOfRestaurantId: z.string().nullable().optional(),
  })
  .strict();

const ERRORS: Record<SubmitReportError, { message: string; status: number }> = {
  INVALID_TARGET: { message: "Nội dung này không còn để báo cáo nữa.", status: 404 },
  INVALID_REASON: { message: "Lý do báo cáo không hợp lệ.", status: 400 },
  NOTE_REQUIRED: { message: "Chọn “Khác” thì ghi thêm vài chữ giúp tụi mình nha.", status: 400 },
  DUPLICATE_TARGET_REQUIRED: { message: "Chọn quán bị trùng giúp tụi mình nha.", status: 400 },
  OWN_CONTENT: { message: "Bạn không thể báo cáo nội dung của chính mình.", status: 403 },
  ALREADY_REPORTED: { message: "Bạn đã báo cáo nội dung này rồi.", status: 409 },
  DAILY_LIMIT: { message: `Hôm nay bạn đã gửi đủ ${MAX_REPORTS_PER_DAY} báo cáo, mai báo tiếp giúp tụi mình nha.`, status: 429 },
};

/** Gửi báo cáo (đánh giá / món / quán) — mọi luật chống lạm dụng ở lib/reports.ts. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Đăng nhập để gửi báo cáo nha." }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Thông tin báo cáo chưa hợp lệ." }, { status: 400 });

  const result = await submitReport(auth.id, parsed.data);
  if (result.error) {
    const { message, status } = ERRORS[result.error];
    return NextResponse.json({ error: message, code: result.error }, { status });
  }
  return NextResponse.json({ ok: true, id: result.reportId }, { status: 201 });
}

const deleteSchema = z.object({ targetType: z.enum(TARGET_TYPES), targetId: z.string().min(1) }).strict();

/** Hoàn tác báo cáo của chính mình — chỉ khi case chưa được xử lý. */
export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const result = await undoReport(auth.id, parsed.data.targetType, parsed.data.targetId);
  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "Không tìm thấy báo cáo của bạn." }, { status: 404 });
  if (result.error === "CASE_CLOSED") {
    return NextResponse.json({ error: "Báo cáo này đã được xử lý nên không hoàn tác được nữa." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

/** `?targetType=food&ids=a,b` → những đối tượng user đã báo cáo (để hiện "Bạn đã báo cáo"). */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType");
  if (!TARGET_TYPES.includes(targetType as (typeof TARGET_TYPES)[number])) {
    return NextResponse.json({ error: "Thiếu targetType." }, { status: 400 });
  }
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  const items = await getMyReportStates(auth.id, targetType as (typeof TARGET_TYPES)[number], ids);
  return NextResponse.json({ items });
}

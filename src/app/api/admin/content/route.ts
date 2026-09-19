import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getContentRows, setContentVisibility } from "@/lib/admin/content";
import { applyModerationDecision } from "@/lib/reviewerData";
import type { ModerationStatus } from "@/types/admin";

const TARGET_TYPES = new Set(["food", "restaurant"]);
const DECISIONS = new Set(["approved", "rejected", "needs_revision"]);
const STATUSES = new Set(["pending", "approved", "rejected", "needs_revision"]);
const VISIBILITIES = new Set(["visible", "hidden"]);

const DECISION_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy nội dung.",
  NOT_PENDING: "Nội dung này không còn ở trạng thái chờ duyệt.",
  SELF_SUBMITTED: "Không thể tự duyệt nội dung do chính bạn đóng góp (BR-F02/F03).",
  REASON_REQUIRED: "Cần nhập lý do/ghi chú khi từ chối hoặc yêu cầu sửa.",
};

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const rows = await getContentRows(status && STATUSES.has(status) ? (status as ModerationStatus) : undefined);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note : "";

  if (typeof targetType !== "string" || !TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: "Thiếu hoặc sai targetType." }, { status: 400 });
  }
  if (typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ error: "Thiếu targetId." }, { status: 400 });
  }
  if (typeof decision !== "string" || !DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Thiếu hoặc sai decision." }, { status: 400 });
  }

  const result = await applyModerationDecision({
    reviewerId: admin.id,
    targetType: targetType as "food" | "restaurant",
    targetId,
    decision: decision as "approved" | "rejected" | "needs_revision",
    note,
  });

  if (result.error) return NextResponse.json({ error: DECISION_ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const visibility = body?.visibility;

  if (typeof targetType !== "string" || !TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: "Thiếu hoặc sai targetType." }, { status: 400 });
  }
  if (typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ error: "Thiếu targetId." }, { status: 400 });
  }
  if (typeof visibility !== "string" || !VISIBILITIES.has(visibility)) {
    return NextResponse.json({ error: "Thiếu hoặc sai visibility." }, { status: 400 });
  }

  const result = await setContentVisibility({
    adminId: admin.id,
    targetType: targetType as "food" | "restaurant",
    targetId,
    visibility: visibility as "visible" | "hidden",
  });

  if (result.error) return NextResponse.json({ error: "Không tìm thấy nội dung." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { REMOVAL_REASON_MAX_LENGTH } from "@/constants/admin";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getContentRows, setContentVisibility } from "@/lib/admin/content";
import { WORKFLOW_ERRORS, decideStandaloneRestaurant, decideSubmission } from "@/lib/submissionWorkflow";
import type { ModerationStatus } from "@/types/admin";

const TARGET_TYPES = new Set(["food", "restaurant"]);
const DECISIONS = new Set(["approved", "rejected", "needs_revision"]);
const STATUSES = new Set(["pending", "in_review", "approved", "rejected", "needs_revision", "withdrawn"]);
const VISIBILITIES = new Set(["visible", "hidden"]);

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

  // Admin quyết định thẳng món đang pending / in_review (override reviewer đang giữ — có thông báo + AuditLog riêng).
  const input = { actorId: admin.id, decision: decision as "approved" | "rejected" | "needs_revision", note };
  const result =
    targetType === "food"
      ? await decideSubmission({ ...input, actorRole: "admin", foodId: targetId })
      : await decideStandaloneRestaurant({ ...input, restaurantId: targetId });

  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const visibility = body?.visibility;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (typeof targetType !== "string" || !TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: "Thiếu hoặc sai targetType." }, { status: 400 });
  }
  if (typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ error: "Thiếu targetId." }, { status: 400 });
  }
  if (typeof visibility !== "string" || !VISIBILITIES.has(visibility)) {
    return NextResponse.json({ error: "Thiếu hoặc sai visibility." }, { status: 400 });
  }

  if (visibility === "hidden" && !reason) {
    return NextResponse.json({ error: "Cần nhập lý do khi gỡ nội dung." }, { status: 400 });
  }
  if (reason.length > REMOVAL_REASON_MAX_LENGTH) {
    return NextResponse.json({ error: "Lý do quá dài." }, { status: 400 });
  }

  const result = await setContentVisibility({
    adminId: admin.id,
    targetType: targetType as "food" | "restaurant",
    targetId,
    visibility: visibility as "visible" | "hidden",
    reason,
  });

  if (result.error) return NextResponse.json({ error: "Không tìm thấy nội dung." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

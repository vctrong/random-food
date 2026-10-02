import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireReviewerSession } from "@/lib/reviewerData";
import { WORKFLOW_ERRORS, decideStandaloneRestaurant, decideSubmission } from "@/lib/submissionWorkflow";

const TARGET_TYPES = new Set(["food", "restaurant"]);
const DECISIONS = new Set(["approved", "rejected", "needs_revision"]);

/**
 * UC-F03/F04/F05: Approve/Reject/NeedsRevision — ghi AuditLog + gửi Notification (BR-F09).
 * Món: reviewer phải đang giữ (in_review, còn hạn). Quán đứng riêng (dữ liệu cũ): quyết định thẳng.
 */
export async function POST(request: Request) {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message =
      reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const body = await request.json().catch(() => null);
  const targetType = body?.targetType;
  const targetId = body?.targetId;
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note : "";

  if (typeof targetType !== "string" || !TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: "Thiếu hoặc sai targetType." }, { status: 400 });
  }
  if (typeof targetId !== "string" || !targetId || !isValidObjectId(targetId)) {
    return NextResponse.json({ error: "Thiếu hoặc sai targetId." }, { status: 400 });
  }
  if (typeof decision !== "string" || !DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Thiếu hoặc sai decision." }, { status: 400 });
  }

  const input = { actorId: reviewer.id, decision: decision as "approved" | "rejected" | "needs_revision", note };
  const result =
    targetType === "food"
      ? await decideSubmission({ ...input, actorRole: "reviewer", foodId: targetId })
      : await decideStandaloneRestaurant({ ...input, restaurantId: targetId });

  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

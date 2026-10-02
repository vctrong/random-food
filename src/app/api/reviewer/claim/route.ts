import { NextResponse } from "next/server";
import { z } from "zod";
import { requireReviewerSession } from "@/lib/reviewerData";
import { WORKFLOW_ERRORS, claimSubmission, releaseSubmission } from "@/lib/submissionWorkflow";
import { claimExpiresAt } from "@/features/contributions/submissionRules";

const bodySchema = z.object({ action: z.enum(["claim", "release"]), foodId: z.string() });

/** "Nhận xác minh" (pending → in_review) / "Nhả" (in_review → pending) một đề xuất món. */
export async function POST(request: Request) {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message = reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  const { action, foodId } = parsed.data;

  if (action === "claim") {
    const result = await claimSubmission(reviewer.id, foodId);
    if (result.error) {
      const { message, status } = WORKFLOW_ERRORS[result.error];
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({
      ok: true,
      claimedAt: result.claimedAt.toISOString(),
      claimExpiresAt: claimExpiresAt(result.claimedAt).toISOString(),
    });
  }

  const result = await releaseSubmission(reviewer.id, foodId);
  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

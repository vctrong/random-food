import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { decideReviewerApplication, getReviewerApplications } from "@/lib/admin/reviewerApplications";

const DECISIONS = new Set(["approved", "rejected"]);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy đơn ứng tuyển.",
  NOT_PENDING: "Đơn này đã được xử lý trước đó.",
};

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const applications = await getReviewerApplications();
  return NextResponse.json(applications);
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const applicationId = body?.applicationId;
  const decision = body?.decision;
  const reason = typeof body?.reason === "string" ? body.reason : "";

  if (typeof applicationId !== "string" || !applicationId) {
    return NextResponse.json({ error: "Thiếu applicationId." }, { status: 400 });
  }
  if (typeof decision !== "string" || !DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Thiếu hoặc sai decision." }, { status: 400 });
  }

  const result = await decideReviewerApplication({
    adminId: admin.id,
    applicationId,
    decision: decision as "approved" | "rejected",
    reason,
  });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}

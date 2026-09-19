import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { decideCategoryProposal, getCategoryProposals } from "@/lib/admin/categories";

const DECISIONS = new Set(["approved", "rejected"]);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy đề xuất.",
  NOT_PENDING: "Đề xuất này đã được xử lý trước đó.",
  SLUG_TAKEN: "Đã tồn tại danh mục trùng tên.",
};

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const proposals = await getCategoryProposals();
  return NextResponse.json(proposals);
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const proposalId = body?.proposalId;
  const decision = body?.decision;

  if (typeof proposalId !== "string" || !proposalId) {
    return NextResponse.json({ error: "Thiếu proposalId." }, { status: 400 });
  }
  if (typeof decision !== "string" || !DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Thiếu hoặc sai decision." }, { status: 400 });
  }

  const result = await decideCategoryProposal({
    adminId: admin.id,
    proposalId,
    decision: decision as "approved" | "rejected",
  });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}

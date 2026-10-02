import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { WORKFLOW_ERRORS, withdrawSubmission } from "@/lib/submissionWorkflow";

/** Chủ đề xuất rút đề xuất đang pending / in_review / needs_revision → withdrawn. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { id } = await params;
  const result = await withdrawSubmission(auth.id, id);
  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ success: true });
}

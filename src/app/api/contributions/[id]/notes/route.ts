import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { WORKFLOW_ERRORS, addSubmissionNote } from "@/lib/submissionWorkflow";

const bodySchema = z.object({ content: z.string() });

/** Chủ đề xuất gửi ghi chú đính chính khi đề xuất đang được xác minh (in_review). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: WORKFLOW_ERRORS.INVALID_NOTE.message }, { status: 400 });

  const { id } = await params;
  const result = await addSubmissionNote(auth.id, id, parsed.data.content);
  if (result.error) {
    const { message, status } = WORKFLOW_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ note: result.note }, { status: 201 });
}

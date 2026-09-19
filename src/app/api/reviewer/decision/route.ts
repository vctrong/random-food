import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { applyModerationDecision, requireReviewerSession } from "@/lib/reviewerData";

const TARGET_TYPES = new Set(["food", "restaurant"]);
const DECISIONS = new Set(["approved", "rejected", "needs_revision"]);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy nội dung cần thẩm định.",
  NOT_PENDING: "Nội dung này không còn ở trạng thái chờ duyệt (đã được xử lý trước đó).",
  SELF_SUBMITTED: "Không thể tự duyệt nội dung do chính bạn đóng góp (BR-F02/F03).",
  REASON_REQUIRED: "Cần nhập lý do/ghi chú khi từ chối hoặc yêu cầu sửa.",
};

/** UC-F03/F04/F05: Approve/Reject/NeedsRevision — ghi AuditLog + gửi Notification (BR-F09). */
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

  const result = await applyModerationDecision({
    reviewerId: reviewer.id,
    targetType: targetType as "food" | "restaurant",
    targetId,
    decision: decision as "approved" | "rejected" | "needs_revision",
    note,
  });

  if (result.error) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

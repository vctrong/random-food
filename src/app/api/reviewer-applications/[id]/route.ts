import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { withdrawApplication, type WithdrawApplicationError } from "@/lib/reviewerApplications";

const ERROR_MESSAGES: Record<WithdrawApplicationError, { message: string; status: number }> = {
  INVALID_ID: { message: "Mã đơn không hợp lệ.", status: 400 },
  NOT_FOUND: { message: "Không tìm thấy đơn ứng tuyển của bạn.", status: 404 },
  NOT_PENDING: { message: "Đơn này không còn ở trạng thái chờ duyệt nên không thể rút.", status: 409 },
};

/** Rút đơn đang chờ duyệt của chính mình: body `{ "action": "withdraw" }`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.action !== "withdraw") return NextResponse.json({ error: "Thiếu hoặc sai action." }, { status: 400 });

  const { id } = await params;
  const result = await withdrawApplication(auth.id, id);
  if (result.error) {
    const { message, status } = ERROR_MESSAGES[result.error];
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ success: true });
}

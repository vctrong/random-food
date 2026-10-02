import { NextResponse } from "next/server";
import { getReviewerQueue, requireReviewerSession } from "@/lib/reviewerData";

/** UC-F01: hàng chờ 2 tab — "Chờ nhận" (pending) và "Đang giữ" (in_review của tôi). */
export async function GET() {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message =
      reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  return NextResponse.json(await getReviewerQueue(reviewer.id));
}

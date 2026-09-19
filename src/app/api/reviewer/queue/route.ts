import { NextResponse } from "next/server";
import { getPendingQueue, requireReviewerSession } from "@/lib/reviewerData";

/** UC-F01: hàng chờ kiểm duyệt (Food + Restaurant ở trạng thái pending). */
export async function GET() {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message =
      reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const items = await getPendingQueue(reviewer.id);
  return NextResponse.json(items);
}

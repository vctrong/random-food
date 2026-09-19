import { NextResponse } from "next/server";
import { getReviewerHistory, getReviewerHistorySummary, requireReviewerSession } from "@/lib/reviewerData";
import type { ReviewHistoryStatusFilter } from "@/types/reviewer";

const STATUS_VALUES = new Set(["all", "approved", "needs_revision", "rejected"]);

/** UC-F06: lịch sử duyệt của bản thân reviewer, có lọc/tìm kiếm/phân trang. */
export async function GET(request: Request) {
  const reviewer = await requireReviewerSession();
  if (!reviewer.ok) {
    const message =
      reviewer.status === 401 ? "Vui lòng đăng nhập." : "Bạn không có quyền truy cập khu vực thẩm định.";
    return NextResponse.json({ error: message }, { status: reviewer.status });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "all";
  const status: ReviewHistoryStatusFilter = STATUS_VALUES.has(statusParam) ? (statusParam as ReviewHistoryStatusFilter) : "all";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [{ entries, total }, summary] = await Promise.all([
    getReviewerHistory({ reviewerId: reviewer.id, status, search, page, pageSize: 10 }),
    getReviewerHistorySummary(reviewer.id),
  ]);

  return NextResponse.json({ entries, total, page, pageSize: 10, summary });
}

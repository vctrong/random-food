import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReviewerHistory, getReviewerHistorySummary } from "@/lib/reviewerData";
import { ReviewerHistoryContent } from "@/components/reviewer/ReviewerHistoryContent";

const PAGE_SIZE = 10;

/** UC-F06: lịch sử duyệt của bản thân reviewer. */
export default async function ReviewerHistoryPage() {
  const session = await getServerSession(authOptions);
  const reviewerId = (session?.user as { id?: string } | undefined)?.id;
  // ReviewerLayout đã chặn user không hợp lệ — guard ở đây vì Next.js vẫn render
  // page.tsx song song để dựng `children` truyền vào layout.
  if (!reviewerId) return null;

  const [{ entries, total }, summary] = await Promise.all([
    getReviewerHistory({ reviewerId, page: 1, pageSize: PAGE_SIZE }),
    getReviewerHistorySummary(reviewerId),
  ]);

  return (
    <ReviewerHistoryContent
      initialEntries={entries}
      initialTotal={total}
      initialSummary={summary}
      pageSize={PAGE_SIZE}
    />
  );
}

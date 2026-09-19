import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPendingQueue } from "@/lib/reviewerData";
import { ReviewerQueueContent } from "@/components/reviewer/ReviewerQueueContent";

/** UC-F01/F02: hàng chờ kiểm duyệt + xem chi tiết nội dung cần duyệt. */
export default async function ReviewerQueuePage() {
  const session = await getServerSession(authOptions);
  const reviewerId = (session?.user as { id?: string } | undefined)?.id;
  // ReviewerLayout (app/reviewer/layout.tsx) đã chặn user không hợp lệ, nhưng Next.js
  // vẫn render page.tsx song song để tạo `children` truyền vào layout — guard ở đây
  // để không crash khi session null (layout sẽ thay thế bằng màn "không có quyền").
  if (!reviewerId) return null;

  const items = await getPendingQueue(reviewerId);

  return <ReviewerQueueContent initialItems={items} />;
}

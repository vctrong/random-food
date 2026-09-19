import { getReviews } from "@/lib/admin/reviews";
import { ReviewsModerationContent } from "@/components/admin/ReviewsModerationContent";

export default async function AdminReviewsPage() {
  const reviews = await getReviews();
  return <ReviewsModerationContent initialReviews={reviews} />;
}

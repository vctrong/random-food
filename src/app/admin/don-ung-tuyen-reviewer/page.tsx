import { getReviewerApplications } from "@/lib/admin/reviewerApplications";
import { ReviewerApplicationsContent } from "@/components/admin/ReviewerApplicationsContent";

export default async function AdminReviewerApplicationsPage() {
  const applications = await getReviewerApplications();
  return <ReviewerApplicationsContent initialApplications={applications} />;
}

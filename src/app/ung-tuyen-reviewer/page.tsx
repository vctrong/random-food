import { getServerSession } from "next-auth";
import { BadgeCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getMyApplicationOverview, listExpertiseOptions } from "@/lib/reviewerApplications";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { ReviewerApplicationPageContent } from "@/components/reviewer/ReviewerApplicationPageContent";

export const dynamic = "force-dynamic";

export default async function ReviewerApplicationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={BadgeCheck}
        title="Đăng nhập để ứng tuyển FoodReviewer"
        description="Bạn cần có tài khoản để nộp đơn và theo dõi kết quả xét duyệt."
        callbackUrl="/ung-tuyen-reviewer"
      />
    );
  }

  const userId = (session.user as { id: string }).id;
  const [{ defaultFullName, ...overview }, categories] = await Promise.all([getMyApplicationOverview(userId), listExpertiseOptions()]);

  return <ReviewerApplicationPageContent overview={overview} categories={categories} defaultFullName={defaultFullName} />;
}

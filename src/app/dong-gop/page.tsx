import { getServerSession } from "next-auth";
import { ChefHat } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { getContributionOverview } from "@/lib/achievements";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { ContributionsPageContent } from "@/components/food/ContributionsPageContent";

export const dynamic = "force-dynamic";

export default async function ContributionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={ChefHat}
        title="Đăng nhập để xem món đã đóng góp"
        description="Theo dõi trạng thái kiểm duyệt và chỉnh sửa các món bạn đã chia sẻ."
        callbackUrl="/dong-gop"
      />
    );
  }

  const userId = (session.user as { id: string }).id;
  await connectDB();
  const [{ contributions, achievements }, categories] = await Promise.all([
    getContributionOverview(userId),
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  return (
    <ContributionsPageContent
      initialContributions={contributions}
      initialAchievements={achievements}
      categories={categories.map((category) => ({
        id: String(category._id),
        name: category.name,
      }))}
    />
  );
}

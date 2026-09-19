import { getServerSession } from "next-auth";
import { History } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAllFoods } from "@/services/foodService";
import { listExperiencesForUser } from "@/lib/experiences";
import { listFavoritesForUser } from "@/lib/favorites";
import { listMyReviewsByFood } from "@/lib/reviews";
import { mapExperiencesToHistoryEntries } from "@/features/history-log/historyLogic";
import { HistoryPageContent } from "@/components/food/HistoryPageContent";
import { RequireLoginState } from "@/components/auth/RequireLoginState";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={History}
        title="Đăng nhập để xem lịch sử ăn uống"
        description="Lịch sử món đã random và đã ăn chỉ lưu cho tài khoản đã đăng nhập."
        callbackUrl="/lich-su"
      />
    );
  }

  const userId = (session.user as { id: string }).id;
  const allFoods = await getAllFoods();
  const [experiences, favorites, reviewsByFood] = await Promise.all([
    listExperiencesForUser(userId),
    listFavoritesForUser(userId),
    listMyReviewsByFood(userId),
  ]);
  const historyEntries = mapExperiencesToHistoryEntries(
    experiences,
    new Set(favorites.map((favorite) => favorite.foodId)),
    allFoods,
    reviewsByFood,
  );

  return (
    <HistoryPageContent
      initialEntries={historyEntries}
      allFoods={allFoods}
      totalFoodsInMenu={allFoods.length}
    />
  );
}

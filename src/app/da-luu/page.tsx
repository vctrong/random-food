import { getServerSession } from "next-auth";
import { Heart } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAllFoods } from "@/services/foodService";
import { listFavoritesForUser } from "@/lib/favorites";
import { SavedFoodsPageContent } from "@/components/food/SavedFoodsPageContent";
import { RequireLoginState } from "@/components/auth/RequireLoginState";

export default async function SavedFoodsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={Heart}
        title="Đăng nhập để xem món đã lưu"
        description="Danh sách món ăn yêu thích chỉ lưu cho tài khoản đã đăng nhập."
        callbackUrl="/da-luu"
      />
    );
  }

  const userId = (session.user as { id: string }).id;
  const allFoods = await getAllFoods();
  const favorites = await listFavoritesForUser(userId);
  const initialRecords = favorites.map((favorite) => ({ foodId: favorite.foodId, savedAt: favorite.createdAt }));

  return <SavedFoodsPageContent initialRecords={initialRecords} allFoods={allFoods} />;
}

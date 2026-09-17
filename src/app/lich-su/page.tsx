import { getServerSession } from "next-auth";
import { History } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAllFoods } from "@/services/foodService";
import { getAllHistory } from "@/services/historyService";
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

  const allFoods = await getAllFoods();
  const historyEntries = getAllHistory();

  return (
    <HistoryPageContent
      initialEntries={historyEntries}
      allFoods={allFoods}
      totalFoodsInMenu={allFoods.length}
    />
  );
}

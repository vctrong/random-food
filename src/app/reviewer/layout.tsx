import { getServerSession } from "next-auth";
import { ShieldAlert } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getPendingQueueCount } from "@/lib/reviewerData";
import { ReviewerSidebar } from "@/components/reviewer/ReviewerSidebar";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Shell chung cho khu vực thẩm định FoodReviewer (docs/BR_UC.md mục 3.3).
 * Gate quyền theo `session.user.role` (chỉ foodreviewer/admin — BR-01, BR-06).
 * Lồng bên trong RootLayout (giữ Header/Footer chung toàn site — không tạo
 * app shell riêng để tránh xáo trộn cấu trúc điều hướng đã có).
 */
export default async function ReviewerLayout({ children }: LayoutProps<"/reviewer">) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={ShieldAlert}
        title="Đăng nhập để vào khu vực thẩm định"
        description="Khu vực này chỉ dành cho FoodReviewer đã được Admin chỉ định."
        callbackUrl="/reviewer"
      />
    );
  }

  if (user?.role !== "foodreviewer" && user?.role !== "admin") {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16">
        <EmptyState
          icon={ShieldAlert}
          title="Bạn chưa phải FoodReviewer"
          description="Tài khoản của bạn chưa được Admin chỉ định vai trò FoodReviewer nên không thể vào khu vực thẩm định."
        />
      </div>
    );
  }

  const pendingCount = await getPendingQueueCount();

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <ReviewerSidebar pendingCount={pendingCount} />
        <div className="flex-1 min-w-0 w-full">{children}</div>
      </div>
    </div>
  );
}

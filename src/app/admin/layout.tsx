import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOverviewStats } from "@/lib/admin/overview";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Shell chung cho khu vực Quản trị — LỚP 2 (DB-backed, xác thực cuối cùng).
 * `src/proxy.ts` (lớp 1) đã chặn phần lớn request không đủ quyền từ trước khi
 * tới đây bằng JWT; layout này KHÔNG được bỏ qua vì proxy có thể trễ role
 * (JWT chỉ đồng bộ lại ở lần getServerSession()/useSession() kế tiếp) hoặc bị
 * bypass. Fail-as-404: mọi lý do không đủ quyền (chưa đăng nhập, sai role, bị
 * ban, token hết hạn) đều gọi notFound() — không phân biệt, không redirect,
 * không hiện thông báo "không có quyền" (sẽ lộ rằng /admin tồn tại).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!session?.user || user?.role !== "admin") {
    notFound();
  }

  const stats = await getOverviewStats();

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <AdminSidebar
          pendingReports={stats.pendingReports}
          pendingReviewerApplications={stats.pendingReviewerApplications}
          pendingCategoryProposals={stats.pendingCategoryProposals}
        />
        <div className="flex-1 min-w-0 w-full">{children}</div>
      </div>
    </div>
  );
}

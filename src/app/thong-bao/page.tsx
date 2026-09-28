import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Bell } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { RequireLoginState } from "@/components/auth/RequireLoginState";
import { NotificationsPageContent } from "@/components/notifications/NotificationsPageContent";

export const metadata: Metadata = {
  title: "Thông báo",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <RequireLoginState
        icon={Bell}
        title="Đăng nhập để xem thông báo"
        description="Thông báo về đóng góp, báo cáo và tài khoản chỉ dành cho tài khoản đã đăng nhập."
        callbackUrl="/thong-bao"
      />
    );
  }

  return <NotificationsPageContent />;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Badge as BadgeIcon,
  FileClock,
  Flag,
  LayoutGrid,
  Star,
  Tags,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  pendingReports: number;
  pendingReviewerApplications: number;
  pendingCategoryProposals: number;
}

export function AdminSidebar({
  pendingReports,
  pendingReviewerApplications,
  pendingCategoryProposals,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Tổng quan", icon: LayoutGrid, exact: true, badge: 0 },
    { href: "/admin/nguoi-dung", label: "Quản lý người dùng", icon: Users, exact: false, badge: 0 },
    {
      href: "/admin/don-ung-tuyen-reviewer",
      label: "Đơn ứng tuyển Reviewer",
      icon: BadgeIcon,
      exact: false,
      badge: pendingReviewerApplications,
    },
    { href: "/admin/noi-dung", label: "Quản lý nội dung ẩm thực", icon: UtensilsCrossed, exact: false, badge: 0 },
    {
      href: "/admin/danh-muc",
      label: "Danh mục hệ thống",
      icon: Tags,
      exact: false,
      badge: pendingCategoryProposals,
    },
    { href: "/admin/danh-gia", label: "Kiểm duyệt đánh giá", icon: Star, exact: false, badge: 0 },
    { href: "/admin/bao-cao", label: "Xử lý báo cáo", icon: Flag, exact: false, badge: pendingReports },
    { href: "/admin/nhat-ky", label: "Nhật ký hệ thống", icon: FileClock, exact: false, badge: 0 },
  ] as const;

  return (
    <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-24 flex flex-col gap-4">
      <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-accent-ink">Admin Workspace</p>
          <h2 className="text-lg font-heading font-semibold text-text-primary mt-0.5">Quản trị hệ thống</h2>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-text-secondary hover:bg-background hover:text-text-primary",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent-strong text-white text-[11px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-text-secondary hover:text-primary hover:bg-primary-soft transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Về trang cộng đồng
          </Link>
        </div>
      </div>
    </aside>
  );
}

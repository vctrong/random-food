"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ClipboardCheck, History, Lock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewerSidebarProps {
  pendingCount: number;
}

const NAV_ITEMS = [
  { href: "/reviewer", label: "Hàng chờ duyệt", icon: ClipboardCheck, exact: true },
  { href: "/reviewer/lich-su", label: "Lịch sử thẩm định", icon: History, exact: false },
] as const;

export function ReviewerSidebar({ pendingCount }: ReviewerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-24 flex flex-col gap-4">
      <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Reviewer Hub</p>
          <h2 className="text-lg font-heading font-semibold text-text-primary mt-0.5">Không gian thẩm định</h2>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
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
                {item.href === "/reviewer" && pendingCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent-strong text-white text-[11px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div
            className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-secondary/50 cursor-not-allowed select-none"
            title="Sắp ra mắt"
          >
            <span className="flex items-center gap-2.5">
              <TrendingUp className="size-4" aria-hidden />
              Thống kê &amp; Uy tín
            </span>
            <Lock className="size-3.5" aria-hidden />
          </div>
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

      <div className="rounded-2xl bg-secondary text-white p-5 flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Nguyên tắc thẩm định</p>
        <p className="text-sm text-white/90 leading-relaxed">
          Chỉ xác minh <span className="font-semibold">tính tồn tại &amp; đúng thông tin</span> của món ăn/quán —
          không xác nhận &quot;ngon hay dở&quot; (BR-F05).
        </p>
      </div>
    </aside>
  );
}

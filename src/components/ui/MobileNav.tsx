"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shuffle, History, Bookmark, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/random", label: "Random", icon: Shuffle },
  { href: "/lich-su", label: "Lịch sử", icon: History },
  { href: "/da-luu", label: "Đã lưu", icon: Bookmark },
  { href: "/cai-dat", label: "Cài đặt", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium"
            >
              <Icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-primary-blue" : "text-text-secondary",
                )}
                aria-hidden
              />
              <span className={cn(isActive ? "text-primary-blue" : "text-text-secondary")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

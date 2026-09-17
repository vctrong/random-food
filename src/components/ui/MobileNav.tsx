"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Shuffle, Newspaper, Info, User, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/mon-an", label: "Món ăn", icon: UtensilsCrossed },
  { href: "/random", label: "Random", icon: Shuffle },
  { href: "/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/ve-chung-toi", label: "Về chúng tôi", icon: Info },
];

export function MobileNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const accountHref = status === "authenticated" ? "/ho-so" : "/dang-nhap";
  const isAccountActive = ["/ho-so", "/cai-dat", "/lich-su", "/da-luu", "/dang-nhap", "/dang-ky"].some(
    (href) => pathname.startsWith(href),
  );

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
        <Link
          href={accountHref}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium"
        >
          <User
            className={cn(
              "size-5 transition-colors",
              isAccountActive ? "text-primary-blue" : "text-text-secondary",
            )}
            aria-hidden
          />
          <span className={cn(isAccountActive ? "text-primary-blue" : "text-text-secondary")}>
            Tài khoản
          </span>
        </Link>
      </div>
    </nav>
  );
}

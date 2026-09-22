"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Home, Shuffle, Newspaper, Info, User, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/mon-an", label: "Món ăn", icon: UtensilsCrossed },
  { href: "/random", label: "Random", icon: Shuffle },
  { href: "/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/ve-chung-toi", label: "Về chúng tôi", icon: Info },
];

const MotionLink = motion.create(Link);

export function MobileNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const accountHref = status === "authenticated" ? "/ho-so" : "/dang-nhap";
  const isAccountActive = ["/ho-so", "/cai-dat", "/lich-su", "/da-luu", "/dang-nhap", "/dang-ky"].some(
    (href) => pathname.startsWith(href),
  );

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between gap-0.5 px-1 py-1.5 rounded-t-3xl bg-surface/95 backdrop-blur-xl border border-border shadow-[0_-4px_20px_-6px_rgba(35,70,111,0.12)]">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <MotionLink
              key={href}
              href={href}
              whileTap={{ scale: 0.92 }}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-[11px] font-medium"
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  className="absolute inset-1 rounded-2xl bg-soft-blue -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                className={cn("size-5 transition-colors", isActive ? "text-primary-blue" : "text-text-secondary")}
                aria-hidden
              />
              <span className={cn(isActive ? "text-primary-blue" : "text-text-secondary")}>{label}</span>
            </MotionLink>
          );
        })}
        <MotionLink
          href={accountHref}
          whileTap={{ scale: 0.92 }}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-[11px] font-medium"
        >
          {isAccountActive && (
            <motion.span
              layoutId="mobile-nav-active-pill"
              className="absolute inset-1 rounded-2xl bg-soft-blue -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <User
            className={cn("size-5 transition-colors", isAccountActive ? "text-primary-blue" : "text-text-secondary")}
            aria-hidden
          />
          <span className={cn(isAccountActive ? "text-primary-blue" : "text-text-secondary")}>Tài khoản</span>
        </MotionLink>
      </div>
    </nav>
  );
}

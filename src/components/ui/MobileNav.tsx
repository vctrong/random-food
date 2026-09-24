"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_ROUTES, MOBILE_DOCK_LINKS, isActiveRoute } from "@/constants/navigation";
import type { NavLink } from "@/constants/navigation";

const MotionLink = motion.create(Link);

function DockItem({ link, isActive }: { link: NavLink; isActive: boolean }) {
  const Icon = link.icon;
  return (
    <MotionLink
      href={link.href}
      whileTap={{ scale: 0.92 }}
      aria-current={isActive ? "page" : undefined}
      className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold"
    >
      {isActive && (
        <motion.span
          layoutId="mobile-dock-active"
          className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl bg-primary-soft"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <Icon className={cn("size-5", isActive ? "text-primary" : "text-text-secondary")} aria-hidden />
      <span className={isActive ? "text-primary-strong dark:text-primary" : "text-text-secondary"}>{link.label}</span>
    </MotionLink>
  );
}

/** Dock nổi dưới cùng (dưới lg): 4 mục + nút Random nổi ở giữa. */
export function MobileNav() {
  const pathname = usePathname();
  const { status } = useSession();

  const [home, saved] = MOBILE_DOCK_LINKS.left;
  const [history, account] = MOBILE_DOCK_LINKS.right;
  const accountLink = { ...account, href: status === "authenticated" ? account.href : "/dang-nhap" };
  const isAccountActive = ACCOUNT_ROUTES.some((href) => pathname.startsWith(href));
  const isRandomActive = isActiveRoute(pathname, "/random");

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 lg:hidden"
    >
      <div className="isolate flex items-center gap-1 rounded-full border border-accent/50 bg-surface/90 px-2 py-1.5 shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--color-primary)_45%,transparent)] backdrop-blur-xl">
        <DockItem link={home} isActive={isActiveRoute(pathname, home.href)} />
        <DockItem link={saved} isActive={isActiveRoute(pathname, saved.href)} />

        <div className="relative flex w-16 shrink-0 justify-center">
          <MotionLink
            href="/random"
            whileTap={{ scale: 0.9 }}
            aria-label="Random món ăn"
            aria-current={isRandomActive ? "page" : undefined}
            className="-mt-8 inline-flex size-14 items-center justify-center rounded-full bg-primary-strong text-white shadow-[0_6px_16px_-4px_color-mix(in_oklab,var(--color-primary-strong)_70%,transparent)] ring-4 ring-background"
          >
            <Dices className="size-6 animate-dice-wiggle" aria-hidden />
          </MotionLink>
        </div>

        <DockItem link={history} isActive={isActiveRoute(pathname, history.href)} />
        <DockItem link={accountLink} isActive={isAccountActive} />
      </div>
    </nav>
  );
}

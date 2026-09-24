"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_NAV_LINKS, isActiveRoute } from "@/constants/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandMark } from "@/components/ui/BrandMark";
import { NavMegaMenu } from "@/components/ui/NavMegaMenu";
import { MobileMenuSheet } from "@/components/ui/MobileMenuSheet";

/** Trễ khi rời chuột khỏi "Món ăn" — đủ để di chuột xuống mega menu mà không bị đóng. */
const MEGA_CLOSE_DELAY_MS = 160;

/**
 * Navbar dạng viên thuốc nổi (mẫu "Chợ Nổi"). Hai trạng thái mặc định/khi cuộn chỉ đổi
 * transform/opacity (wordmark mờ đi, linh vật thu nhỏ, bóng đậm hơn) nên không giật layout.
 * Chiều cao vùng navbar = --header-h (globals.css) — <main> chừa đúng khoảng này.
 */
export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsMegaOpen(true);
  };
  const scheduleCloseMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsMegaOpen(false), MEGA_CLOSE_DELAY_MS);
  };
  const closeMega = useCallback(() => setIsMegaOpen(false), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-2 lg:px-6 lg:pt-3">
        <div
          className={cn(
            "pointer-events-auto relative mx-auto max-w-7xl transition-transform duration-300",
            isScrolled && "lg:-translate-y-1",
          )}
        >
          {/* Quầng sáng dưới thanh — mờ dần khi cuộn. */}
          <div
            aria-hidden
            className={cn(
              "absolute -inset-1 -z-10 rounded-full bg-primary/20 blur-xl transition-opacity duration-500",
              isScrolled ? "opacity-0" : "opacity-70",
            )}
          />
          <nav
            aria-label="Điều hướng chính"
            className="relative flex h-14 items-center justify-between gap-2 rounded-2xl border border-accent/40 bg-surface/85 px-2 backdrop-blur-xl lg:gap-3 lg:rounded-full lg:px-3"
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--color-primary)_45%,transparent)] transition-opacity duration-300",
                isScrolled ? "opacity-100" : "opacity-50",
              )}
            />

            <Link href="/" className="relative shrink-0 rounded-full pl-1" aria-label="Nay Ăn Gì? — về trang chủ">
              <BrandMark compact={isScrolled} showTagline priority className="hidden xl:flex" />
              <BrandMark priority className="xl:hidden" wordmarkClassName="lg:hidden" />
            </Link>

            {/* Link chính (desktop) */}
            <div className="relative hidden items-center gap-1 rounded-full border border-border bg-background/60 p-1 lg:flex">
              {MAIN_NAV_LINKS.map((link) => {
                const isActive = isActiveRoute(pathname, link.href);
                const isFoods = link.href === "/mon-an";
                const isRandom = link.href === "/random";
                const linkClass = cn(
                  "relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors xl:px-4",
                  isActive
                    ? "text-white"
                    : isRandom
                      ? "text-accent-ink hover:bg-accent-soft"
                      : "text-text-secondary hover:bg-accent-soft hover:text-text-primary",
                );
                const activePill = isActive && (
                  <motion.span
                    layoutId="header-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary-strong shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                );

                if (isFoods) {
                  return (
                    <div
                      key={link.href}
                      className="relative isolate flex items-center"
                      onMouseEnter={openMega}
                      onMouseLeave={scheduleCloseMega}
                      onKeyDown={(event) => event.key === "Escape" && closeMega()}
                    >
                      <Link href={link.href} className={cn(linkClass, "pr-2 xl:pr-2")} aria-current={isActive ? "page" : undefined}>
                        {activePill}
                        {link.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setIsMegaOpen((open) => !open)}
                        aria-expanded={isMegaOpen}
                        aria-controls="nav-mega-menu"
                        aria-label="Mở menu chọn món theo mức ăn"
                        className={cn(
                          "-ml-1 inline-flex size-7 items-center justify-center rounded-full transition-colors",
                          isActive ? "text-white" : "text-text-secondary hover:bg-accent-soft",
                        )}
                      >
                        <ChevronDown className={cn("size-4 transition-transform duration-300", isMegaOpen && "rotate-180")} aria-hidden />
                      </button>
                    </div>
                  );
                }

                return (
                  <Link key={link.href} href={link.href} className={cn(linkClass, "isolate")} aria-current={isActive ? "page" : undefined}>
                    {activePill}
                    {link.label}
                    {isRandom && !isActive && (
                      <span className="inline-flex size-5 items-center justify-center rounded-md bg-accent-soft text-accent-ink animate-dice-wiggle">
                        <Dices className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </Link>
                );
              })}

              <AnimatePresence>
                {isMegaOpen && (
                  <motion.div
                    id="nav-mega-menu"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={openMega}
                    onMouseLeave={scheduleCloseMega}
                    className="absolute top-full left-1/2 z-50 w-[640px] pt-3"
                    style={{ x: "-50%" }}
                  >
                    <NavMegaMenu onNavigate={closeMega} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nhóm phải (desktop) */}
            <div className="relative hidden shrink-0 items-center gap-2 lg:flex">
              <ThemeToggle />
              <UserMenu />
              <Link
                href="/random"
                className="group inline-flex h-10 items-center gap-2 rounded-full bg-primary-strong px-4 font-heading text-sm text-white shadow-[0_4px_0_0_var(--color-primary-strong-hover)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
              >
                <Dices className="size-4.5 transition-transform duration-500 group-hover:rotate-[360deg]" aria-hidden />
                <span className="hidden xl:inline">Random ngay</span>
                <span className="xl:hidden">Random</span>
              </Link>
            </div>

            {/* Nhóm phải (mobile/tablet) */}
            <div className="relative flex shrink-0 items-center gap-2 lg:hidden">
              <Link
                href="/random"
                aria-label="Random món ăn"
                className="inline-flex size-11 items-center justify-center rounded-full border border-accent/60 bg-accent-soft text-accent-ink shadow-sm"
              >
                <Dices className="size-5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                aria-label="Mở menu"
                className="inline-flex size-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-surface shadow-sm"
              >
                {/* Hamburger hình đôi đũa */}
                <span aria-hidden className="h-0.5 w-5 rotate-6 rounded-full bg-secondary" />
                <span aria-hidden className="h-0.5 w-5 -rotate-6 rounded-full bg-secondary" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <MobileMenuSheet open={isMenuOpen} pathname={pathname} onClose={closeMenu} />
    </>
  );
}

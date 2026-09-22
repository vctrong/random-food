"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Dice5 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/mon-an", label: "Món ăn" },
  { href: "/random", label: "Random" },
  { href: "/ve-chung-toi", label: "Về chúng tôi" },
  { href: "/tin-tuc", label: "Tin tức" },
];

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 bg-cream/90 backdrop-blur-xl border-b border-border transition-[height,box-shadow] duration-300",
        isScrolled ? "h-14 shadow-sm" : "h-16",
      )}
    >
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/image/logo.png"
            alt="Hôm Nay Ăn Gì?"
            width={400}
            height={96}
            priority
            className={cn("w-auto transition-all duration-300", isScrolled ? "h-7" : "h-9")}
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface border border-border">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive ? "text-primary-blue font-bold" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="header-active-pill"
                    className="absolute inset-0 rounded-full bg-soft-blue -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/random"
            className="group relative hidden sm:inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary-blue text-white font-semibold text-sm shadow-[0_4px_14px_-2px_rgba(91,158,235,0.5)] hover:bg-[#4a8ddb] hover:shadow-lg active:scale-95 transition-all overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-surface/30 opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer-sweep_0.9s_ease-out]" />
            <Dice5 className="size-4" aria-hidden />
            <span>Random ngay</span>
          </Link>
          <ThemeToggle className="hidden sm:flex" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

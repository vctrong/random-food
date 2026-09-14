"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/random", label: "Random" },
  { href: "/lich-su", label: "Lịch sử" },
  { href: "/da-luu", label: "Đã lưu" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-cream/90 backdrop-blur-xl border-b border-border">
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-blue text-white">
            <ChefHat className="size-4.5" aria-hidden />
          </span>
          <span className="hidden sm:inline-block font-semibold tracking-tight text-text-primary">
            Hôm Nay Ăn Gì?
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white border border-border">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive
                    ? "bg-soft-blue text-primary-blue font-bold"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Button href="/random" size="sm" leftIcon={<Shuffle className="size-4" aria-hidden />}>
          <span className="hidden sm:inline">Random ngay</span>
          <span className="sm:hidden">Random</span>
        </Button>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/UserMenu";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/mon-an", label: "Món ăn" },
  { href: "/random", label: "Random" },
  { href: "/ve-chung-toi", label: "Về chúng tôi" },
  { href: "/tin-tuc", label: "Tin tức" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-cream/90 backdrop-blur-xl border-b border-border">
      <div className="h-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/image/logo.png"
            alt="Hôm Nay Ăn Gì?"
            width={400}
            height={96}
            priority
            className="h-9 w-auto"
          />
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

        <UserMenu />
      </div>
    </header>
  );
}

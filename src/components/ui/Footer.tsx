import Link from "next/link";
import { ChefHat } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/random", label: "Random món" },
  { href: "/lich-su", label: "Lịch sử" },
  { href: "/da-luu", label: "Đã lưu" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-border mt-16 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-blue text-white">
            <ChefHat className="size-4.5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-text-primary leading-tight">Hôm Nay Ăn Gì?</p>
            <p className="text-sm text-text-secondary leading-tight">
              Không còn băn khoăn mỗi bữa ăn.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-text-secondary">© 2026 Hôm Nay Ăn Gì?</p>
      </div>
    </footer>
  );
}

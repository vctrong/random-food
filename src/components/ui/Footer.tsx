import Link from "next/link";
import Image from "next/image";

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
        <div className="flex flex-col items-center sm:items-start gap-1.5">
          <Image src="/image/logo.png" alt="Hôm Nay Ăn Gì?" width={400} height={96} className="h-8 w-auto" />
          <p className="text-sm text-text-secondary leading-tight">
            Không còn băn khoăn mỗi bữa ăn.
          </p>
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

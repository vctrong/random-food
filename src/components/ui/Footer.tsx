import Link from "next/link";
import Image from "next/image";
import { Globe, Mail, MessageCircle } from "lucide-react";

const FOOTER_COLUMNS = [
  {
    title: "Khám phá",
    links: [
      { href: "/", label: "Trang chủ" },
      { href: "/random", label: "Random món" },
      { href: "/mon-an", label: "Món ăn" },
      { href: "/tin-tuc", label: "Tin tức" },
    ],
  },
  {
    title: "Tiện ích",
    links: [
      { href: "/lich-su", label: "Lịch sử" },
      { href: "/da-luu", label: "Đã lưu" },
      { href: "/cai-dat", label: "Cài đặt" },
    ],
  },
  {
    title: "Về chúng tôi",
    links: [
      { href: "/ve-chung-toi", label: "Giới thiệu" },
      { href: "/dang-nhap", label: "Đăng nhập" },
      { href: "/dang-ky", label: "Đăng ký" },
    ],
  },
];

const CONTACT_LINKS = [
  {
    href: "mailto:trongvc.work913@gmail.com",
    label: "trongvc.work913@gmail.com",
    icon: Mail,
  },
  {
    href: "https://zalo.me/0336922235",
    label: "Zalo 0336 922 235",
    icon: MessageCircle,
  },
  {
    href: "https://nayangi.io.vn",
    label: "nayangi.io.vn",
    icon: Globe,
  },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="w-full bg-deep-blue text-white/80 mt-16 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-2">
          <div className="inline-flex w-fit rounded-xl bg-surface p-2">
            <Image src="/image/logo.png" alt="Hôm Nay Ăn Gì?" width={400} height={96} className="h-7 w-auto" />
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            Không còn băn khoăn mỗi bữa ăn — trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            {CONTACT_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-fit"
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span>{label}</span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <a
              href="https://facebook.com/nayangi.social"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook NayAnGi"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface/10 hover:bg-surface/20 text-white transition-colors"
            >
              <FacebookIcon className="size-4" />
            </a>
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/50">
              {column.title}
            </span>
            {column.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/75 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 text-sm text-white/50 text-center sm:text-left">
          © 2026 Hôm Nay Ăn Gì?
        </div>
      </div>
    </footer>
  );
}

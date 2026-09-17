import Link from "next/link";
import Image from "next/image";

const FOOTER_COLUMNS = [
  {
    title: "Khám phá",
    links: [
      { href: "/", label: "Trang chủ" },
      { href: "/random", label: "Random món" },
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

export function Footer() {
  return (
    <footer className="w-full bg-deep-blue text-white/80 mt-16 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <div className="inline-flex w-fit rounded-xl bg-white p-2">
            <Image src="/image/logo.png" alt="Hôm Nay Ăn Gì?" width={400} height={96} className="h-7 w-auto" />
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            Không còn băn khoăn mỗi bữa ăn — trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.
          </p>
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

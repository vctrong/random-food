import Link from "next/link";
import { ArrowRight, Globe, Info, Mail, MessageCircle } from "lucide-react";

interface AboutSectionProps {
  version: string;
  totalFoodsCount: number;
}

const CONTACT_LINKS = [
  { href: "mailto:trongvc.work913@gmail.com", label: "trongvc.work913@gmail.com", icon: Mail },
  { href: "https://zalo.me/0336922235", label: "Zalo 0336 922 235", icon: MessageCircle },
  { href: "https://nayangi.io.vn", label: "nayangi.io.vn", icon: Globe },
];

export function AboutSection({ version, totalFoodsCount }: AboutSectionProps) {
  return (
    <section id="ve-app" className="bg-surface rounded-2xl p-6 shadow-sm space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex p-2 rounded-xl bg-primary-soft text-primary">
            <Info className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Về Nay Ăn Gì?</h2>
            <p className="text-sm text-text-secondary">
              Trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ — {totalFoodsCount} món ăn đang có trong thực đơn.
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary-soft/50 text-text-secondary shrink-0">
          v{version}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {CONTACT_LINKS.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </a>
        ))}
      </div>

      <Link
        href="/ve-chung-toi"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-strong transition-colors"
      >
        Xem đầy đủ trang Về chúng tôi
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

import Link from "next/link";
import { Compass, Globe, Heart, Mail, MessageCircle, Sailboat, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND, CONTACTS } from "@/constants/brand";
import { FOOTER_COLUMNS } from "@/constants/navigation";
import { FooterSky } from "@/components/footer/FooterSky";
import { FooterMiniRandom } from "@/components/footer/FooterMiniRandom";
import { RiverScene } from "@/components/footer/RiverScene";
import { ScrollTopButton } from "@/components/footer/ScrollTopButton";
import { BrandLogo } from "@/components/ui/BrandLogo";

const COLUMN_ICONS: LucideIcon[] = [Compass, Wrench, Sailboat];
const COLUMN_ICON_TONES = ["text-primary", "text-accent-ink", "text-secondary"];

const CONTACT_CHIPS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: `mailto:${CONTACTS.email}`, label: CONTACTS.email, icon: Mail },
  { href: CONTACTS.zalo, label: `Zalo: ${CONTACTS.phoneDisplay}`, icon: MessageCircle },
  { href: CONTACTS.website, label: CONTACTS.websiteDisplay, icon: Globe },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

/**
 * Footer "Chợ Nổi": sóng + bầu trời chạng vạng (SVG nhiều lớp, animate transform/opacity,
 * tự tắt với reduced-motion qua rule global), khung thương hiệu + 3 cột link, mini random
 * nối dữ liệu món thật, cảnh ghe nhấp nhô và wordmark chìm dưới nước.
 */
export function Footer() {
  return (
    <footer className="relative mt-16 w-full overflow-x-clip select-none">
      <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="-mb-px block h-14 w-full fill-accent-soft lg:h-20">
        <path d="M0,32L48,42.7C96,53,192,75,288,74.7C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,74.7C1248,64,1344,32,1392,16L1440,0L1440,120L0,120Z" />
      </svg>

      <div className="relative bg-gradient-to-b from-accent-soft via-background to-primary-soft px-4 pt-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-6 lg:px-12 lg:pb-8">
        <FooterSky />

        {/* Khung thương hiệu + 3 cột link */}
        <div className="relative z-10 mx-auto mt-10 max-w-6xl rounded-[28px] border-2 border-accent/40 bg-surface/85 p-6 shadow-xl backdrop-blur-md sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <BrandLogo />
              <p className="max-w-md text-sm leading-relaxed font-medium text-text-secondary md:text-base">
                {BRAND.description} Một cú chạm là xong ngay món ngon chuẩn vị Tây Đô!
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTACT_CHIPS.map(({ href, label, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-surface px-3 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary-soft"
                  >
                    <Icon className="size-3.5 text-primary" aria-hidden />
                    {label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-secondary">Theo dõi tụi mình:</span>
                <a
                  href={CONTACTS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Nay Ăn Gì?"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-primary/30 bg-surface text-primary shadow-sm transition-transform hover:scale-110"
                >
                  <FacebookIcon className="size-4.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
              {FOOTER_COLUMNS.map((column, index) => {
                const Icon = COLUMN_ICONS[index];
                return (
                  <nav key={column.title} aria-label={column.title} className="space-y-3.5">
                    <h2 className="flex items-center gap-1.5 font-heading text-base text-text-primary">
                      <Icon className={`size-4.5 ${COLUMN_ICON_TONES[index]}`} aria-hidden />
                      {column.title}
                    </h2>
                    <ul className="space-y-2 text-sm font-medium text-text-secondary">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="inline-block py-0.5 transition-[color,transform] duration-200 hover:translate-x-1 hover:text-primary-strong dark:hover:text-primary"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12">
          <FooterMiniRandom />
        </div>

        <div className="relative mt-10 -mx-4 md:-mx-6 lg:-mx-12">
          <RiverScene />
        </div>

        {/* Wordmark chìm dưới nước + bản quyền */}
        <div className="relative z-10 text-center">
          <p
            aria-hidden
            className="pointer-events-none -mt-4 overflow-hidden font-heading text-[clamp(3.25rem,15vw,9rem)] leading-none whitespace-nowrap text-transparent opacity-30 [-webkit-text-stroke:2px_var(--color-primary)]"
          >
            {BRAND.name}
          </p>
          <div className="mx-auto mt-4 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-primary/20 pt-5 text-xs text-text-secondary sm:flex-row">
            <p className="flex items-center gap-1.5">
              © 2026 {BRAND.name} — Làm bằng cả trái tim ở Cần Thơ
              <Heart className="size-3.5 fill-accent-strong text-accent-strong" aria-hidden />
            </p>
            <ScrollTopButton />
          </div>
        </div>
      </div>
    </footer>
  );
}

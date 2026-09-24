import Link from "next/link";
import { BookOpen, Dices, Globe, Heart, Mail, MessageCircle, Phone, Plus, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { ABOUT_CONTACTS } from "@/constants/about";
import type { AboutContactIcon } from "@/constants/about";

const CONTACT_ICONS: Record<AboutContactIcon, LucideIcon> = {
  mail: Mail,
  phone: Phone,
  message: MessageCircle,
  globe: Globe,
  share: Share2,
};

export function AboutCta() {
  return (
    <section aria-labelledby="about-cta-title" className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6 md:pb-20 lg:px-8">
      <Reveal className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent/40 bg-accent-soft p-5 text-center sm:flex-row sm:p-6 sm:text-left">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white">
            <Heart className="size-6 fill-current" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-text-primary sm:text-base">
            <strong>Cảm ơn bạn</strong> đã góp quán, viết đánh giá và cùng tụi mình giữ cho thông tin luôn chân thật.
            Mỗi đóng góp nhỏ đều làm tấm bản đồ ẩm thực Cần Thơ thêm đầy đặn.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08} className="mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-primary-line bg-primary-soft p-6 sm:p-10 lg:p-12">
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="text-center lg:col-span-7 lg:text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-accent-ink">
                Bạn đã sẵn sàng chưa?
              </span>
              <h2 id="about-cta-title" className="text-display-sm mt-3 text-text-primary">
                Nay ăn gì? Để tụi mình lo!
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-text-secondary lg:mx-0">
                Đừng để giờ nghỉ trưa trôi qua trong phân vân. Một cú chạm, một món ngon, một quán để đi ngay.
              </p>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Link
                  href="/random"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-strong px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-strong-hover"
                >
                  <Dices className="size-5" aria-hidden />
                  Random ngay một món
                </Link>
                <Link
                  href="/dong-gop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-bold text-text-primary transition-colors hover:border-primary hover:text-primary-strong dark:hover:text-primary"
                >
                  <Plus className="size-5" aria-hidden />
                  Đóng góp quán ăn
                </Link>
              </div>
              <a
                href="#thu-ngo"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                <BookOpen className="size-4" aria-hidden />
                Đọc lại thư ngỏ
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 lg:col-span-5">
              <h3 className="text-h4 text-text-primary">Kết nối với tụi mình</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Có góp ý, biết quán ngon chưa có trên app hay muốn hợp tác? Nhắn tụi mình nhé.
              </p>
              <ul className="mt-4 space-y-1">
                {ABOUT_CONTACTS.map(({ icon, label, value, href }) => {
                  const Icon = CONTACT_ICONS[icon];
                  const external = href.startsWith("http");
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-primary-soft"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="text-sm text-text-secondary">{label}</span>
                        <span className="ml-auto min-w-0 truncate text-sm font-semibold text-text-primary">{value}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

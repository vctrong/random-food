import { Bookmark, HeartHandshake, MapPin, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { AboutPhoto } from "@/components/about/AboutPhoto";
import { ABOUT_IMAGES, ABOUT_VALUES } from "@/constants/about";
import type { AboutIconKey, AboutValue } from "@/constants/about";

const ICONS: Record<AboutIconKey, LucideIcon> = {
  zap: Zap,
  "map-pin": MapPin,
  "heart-handshake": HeartHandshake,
  bookmark: Bookmark,
};

const TONES: Record<AboutValue["tone"], { icon: string; tag: string }> = {
  primary: { icon: "bg-primary-soft text-primary", tag: "text-primary-strong dark:text-primary" },
  accent: { icon: "bg-accent-soft text-accent-ink", tag: "text-accent-ink" },
};

export function CoreValues() {
  return (
    <section aria-labelledby="values-title" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-7 lg:order-2">
          <SectionHeading
            id="values-title"
            eyebrow="Sứ mệnh"
            title="Biến việc chọn món thành một niềm vui nhỏ mỗi ngày"
            description="Đồng thời giới thiệu ẩm thực Cần Thơ, từ quán nổi tiếng đến những hàng quen ít người biết, đến nhiều người hơn. Bốn điều dưới đây là thứ tụi mình luôn giữ khi làm NayAnGi."
          />
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-5 lg:order-1">
          <AboutPhoto
            image={ABOUT_IMAGES.collage}
            sizes="(min-width: 1152px) 450px, (min-width: 1024px) 40vw, 100vw"
            className="aspect-[16/9] w-full shadow-sm"
          />
        </Reveal>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ABOUT_VALUES.map((value, index) => {
          const Icon = ICONS[value.icon];
          const tone = TONES[value.tone];
          return (
            <Reveal as="li" key={value.title} delay={index * 0.06}>
              <Card hoverable className="flex h-full flex-col p-6">
                <span className={`inline-flex size-12 items-center justify-center rounded-xl ${tone.icon}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="text-h3 mt-4 text-text-primary">{value.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{value.description}</p>
                <p className={`mt-4 border-t border-border pt-3 text-xs font-extrabold uppercase tracking-wider ${tone.tag}`}>
                  {value.feature}
                </p>
              </Card>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

import { ArrowDown, HeartHandshake, MapPin, Soup, Timer } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { AboutPhoto } from "@/components/about/AboutPhoto";
import { ABOUT_IMAGES } from "@/constants/about";

interface AboutHeroProps {
  restaurantCount: number;
}

export function AboutHero({ restaurantCount }: AboutHeroProps) {
  const chips = [
    {
      icon: MapPin,
      label: `${new Intl.NumberFormat("vi-VN").format(restaurantCount)} quán ở Cần Thơ`,
      className: "bg-primary-soft text-primary-strong border-primary-line dark:text-primary",
    },
    {
      icon: Timer,
      label: "Một chạm là có món",
      className: "bg-accent-soft text-accent-ink border-accent/40",
    },
    {
      icon: HeartHandshake,
      label: "Miễn phí, dùng ngay trên web",
      className: "bg-secondary-soft text-secondary-strong border-secondary/20 dark:text-text-primary",
    },
  ];

  return (
    <section aria-labelledby="about-title" className="relative overflow-hidden">
      <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-12 pb-16 md:px-6 md:pt-16 md:pb-20 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-primary">
            <Soup className="size-3.5" aria-hidden />
            Câu chuyện của NayAnGi
          </span>
          <h1 id="about-title" className="text-display mt-4 text-text-primary">
            Về chúng tôi
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-secondary md:text-lg">
            Ai ở Cần Thơ cũng từng có lúc đói bụng mà đứng trước cả trăm lựa chọn, hỏi nhau nửa tiếng vẫn chưa quyết
            được ăn gì. <strong className="text-text-primary">NayAnGi</strong> ra đời để giải quyết đúng nỗi khổ nhỏ
            mà ai cũng gặp đó.
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {chips.map(({ icon: Icon, label, className }) => (
              <li
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${className}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Mobile/tablet: 2 cột (ảnh lớn full, 2 ảnh dọc cạnh nhau, thẻ full). Từ lg: lưới 12 cột x 2 hàng. */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:mt-14 lg:h-[540px] lg:grid-cols-12 lg:grid-rows-2">
          <Reveal className="col-span-2 h-full lg:col-span-5 lg:row-span-2">
            <AboutPhoto
              image={ABOUT_IMAGES.bunCha}
              priority
              sizes="(min-width: 1152px) 460px, (min-width: 1024px) 42vw, 100vw"
              className="aspect-[4/3] h-full w-full md:aspect-[16/9] lg:aspect-auto"
            />
          </Reveal>
          <Reveal delay={0.08} className="h-full lg:col-span-3 lg:row-span-2">
            <AboutPhoto
              image={ABOUT_IMAGES.pho}
              sizes="(min-width: 1152px) 280px, (min-width: 1024px) 25vw, 50vw"
              className="aspect-[3/4] h-full w-full lg:aspect-auto"
            />
          </Reveal>
          <Reveal delay={0.16} className="h-full lg:col-span-4">
            <AboutPhoto
              image={ABOUT_IMAGES.banhMi}
              sizes="(min-width: 1152px) 370px, (min-width: 1024px) 33vw, 50vw"
              className="aspect-[3/4] h-full w-full lg:aspect-auto"
              imageClassName="object-[center_60%]"
            />
          </Reveal>
          <Reveal delay={0.24} className="col-span-2 h-full lg:col-span-4">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-accent-ink">
                  Bản đồ vị giác Tây Đô
                </span>
                <h2 className="text-h3 mt-2 text-text-primary">Ăn chuẩn thổ địa, khỏi lo chọn sai</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Từ quán nổi tiếng đến những hàng quen ít người biết, được chính người yêu ăn uống ở Cần Thơ góp lại.
                </p>
              </div>
              <a
                href="#thu-ngo"
                className="mt-4 inline-flex items-center gap-1.5 self-start rounded-lg text-sm font-bold text-primary-strong transition-colors hover:text-primary-strong-hover dark:text-primary dark:hover:text-primary-line"
              >
                Đọc thư ngỏ của tụi mình
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

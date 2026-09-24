import { Patrick_Hand } from "next/font/google";
import { Heart, Mail, Soup } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { ABOUT_LETTER } from "@/constants/about";

/**
 * Patrick Hand CHỈ dùng cho body thư ngỏ — khai báo ngay trong component này và chỉ
 * gắn .variable lên <article> để biến --font-letter không tồn tại ở nơi nào khác.
 * Tiêu đề, lời chào, "Thân gửi," và chữ ký dùng Sedgwick Ave (--font-handwriting,
 * load ở src/app/ve-chung-toi/layout.tsx).
 */
const patrickHand = Patrick_Hand({
  variable: "--font-letter",
  weight: "400",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export function OpenLetter() {
  const letter = ABOUT_LETTER;

  return (
    <section
      id="thu-ngo"
      aria-labelledby="letter-title"
      className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20 lg:px-8"
    >
      <Reveal className="mx-auto max-w-3xl">
        {/* Nền giấy: secondary-soft (kem ấm ở light, nâu trầm ở dark) — không thêm màu mới. */}
        <article
          className={`${patrickHand.variable} relative rounded-3xl border border-secondary/20 bg-secondary-soft px-6 pt-12 pb-10 shadow-sm sm:px-12 sm:pt-14 sm:pb-12 lg:px-16 lg:pt-16 lg:pb-14 dark:border-white/5`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-2.5 rounded-[1.25rem] border border-dashed border-secondary/25 sm:inset-3.5 dark:border-white/10"
          />

          {/* Con dấu sáp */}
          <div
            aria-hidden
            className="absolute -top-5 right-6 flex size-20 rotate-12 flex-col items-center justify-center rounded-full bg-accent-strong text-white shadow-md ring-4 ring-background sm:right-12"
          >
            <Soup className="size-6" />
            <span className="mt-0.5 text-[10px] font-extrabold tracking-wider">CẦN THƠ</span>
          </div>

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-surface/70 px-3 py-1 dark:bg-accent-soft text-[11px] font-extrabold uppercase tracking-widest text-secondary-strong dark:text-accent-ink">
              <Mail className="size-3.5" aria-hidden />
              {letter.eyebrow}
            </span>

            <h2 id="letter-title" className="text-display-handwriting mt-5 pr-16 text-text-primary sm:pr-20">
              {letter.heading}
            </h2>

            <p className="mt-6 font-handwriting text-2xl leading-snug text-accent-ink sm:text-[1.75rem]">
              {letter.greeting}
            </p>

            <div className="letter-body mt-6 text-text-primary dark:text-text-primary/90">
              {letter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <blockquote className="rounded-r-2xl border-l-4 border-accent bg-surface/70 px-5 py-4 dark:bg-accent-soft text-secondary-strong dark:text-accent-ink">
                <p>{letter.quote}</p>
              </blockquote>
              {letter.closingParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-10 flex items-end justify-between gap-4">
              <div>
                <p className="font-handwriting text-xl text-secondary-strong sm:text-2xl dark:text-text-secondary">
                  {letter.signOff}
                </p>
                <p className="mt-1 font-handwriting text-3xl leading-tight text-primary-strong sm:text-4xl dark:text-primary">
                  {letter.signature}
                </p>
                <p className="mt-2 text-sm font-semibold text-secondary-strong dark:text-text-secondary">
                  {letter.signatureNote}
                </p>
              </div>
              <span
                aria-hidden
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-surface/80 text-accent-ink dark:bg-accent-soft"
              >
                <Heart className="size-6 fill-current" />
              </span>
            </div>
          </div>
        </article>
      </Reveal>
    </section>
  );
}

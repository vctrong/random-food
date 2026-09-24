"use client";

import Link from "next/link";
import { Dice5, Heart } from "lucide-react";
import { useLandingRandom } from "@/features/random-food/LandingRandomProvider";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCtaSection() {
  const { scrollToMachineAndSpin, isRandomizing } = useLandingRandom();

  return (
    <section aria-labelledby="final-cta-title" className="mx-auto w-full max-w-6xl px-4 pb-4 md:px-6 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border-2 border-secondary bg-secondary px-6 py-12 text-center shadow-chunky sm:px-12 sm:py-16 dark:border-white/10">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-primary/35 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white">
              Miễn phí · Dùng ngay trên web
            </span>
            <h2 id="final-cta-title" className="text-display-sm mt-4 text-white">
              Sẵn sàng để số phận chọn món cho bạn?
            </h2>
            <p className="mt-3 text-base sm:text-lg text-white/85">
              Dứt điểm câu hỏi “Ăn gì ta?”. Một cú gạt cần — trúng ngay món ngon đúng gu.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={scrollToMachineAndSpin}
                disabled={isRandomizing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-secondary bg-warning px-7 py-3.5 font-heading text-base font-bold text-secondary-strong shadow-[0_4px_0_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-70"
              >
                <Dice5 className="size-5" aria-hidden />
                Random ngay bây giờ
              </button>
              <Link
                href="/da-luu"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-7 py-3.5 font-heading text-base font-bold text-white transition-colors hover:bg-white/20"
              >
                <Heart className="size-5 text-accent-ink" aria-hidden />
                Xem món đã lưu
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

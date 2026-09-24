"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { CountUpNumber } from "@/components/ui/CountUpNumber";
import { ABOUT_STATS } from "@/constants/about";
import type { LandingStats } from "@/lib/landing";

export function AboutStatsBand(stats: LandingStats) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section aria-label="Con số của NayAnGi" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <div ref={ref} className="relative overflow-hidden rounded-3xl bg-primary-strong px-6 py-10 text-white shadow-sm sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/40 blur-3xl" />
        <p className="relative text-center text-[11px] font-extrabold uppercase tracking-widest text-white/80">
          Con số thật từ hệ thống
        </p>
        <dl className="relative mt-6 grid grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:gap-4 sm:divide-x sm:divide-white/20">
          {ABOUT_STATS.map((stat, index) => (
            <div key={stat.key} className="flex flex-col-reverse">
              <dt className="mt-1 text-sm font-semibold text-white/85">{stat.label}</dt>
              <dd>
                <CountUpNumber
                  target={stats[stat.key]}
                  active={isInView}
                  suffix={stat.suffix}
                  className={`text-stat md:text-5xl ${index === ABOUT_STATS.length - 1 ? "text-accent" : "text-white"}`}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

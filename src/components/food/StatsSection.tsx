"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LuckyWheel } from "@/components/food/LuckyWheel";
import { CountUpNumber } from "@/components/ui/CountUpNumber";

interface StatsSectionProps {
  foodCount: number;
  restaurantCount: number;
  randomCount90d: number;
}

const STATS: { key: keyof StatsSectionProps; label: string; suffix: string; toneClassName: string }[] = [
  { key: "foodCount", label: "Món ăn đã duyệt", suffix: "+", toneClassName: "text-primary" },
  { key: "restaurantCount", label: "Quán chuẩn vị Tây Đô", suffix: "+", toneClassName: "text-accent-ink" },
  { key: "randomCount90d", label: "Lượt random 90 ngày qua", suffix: "", toneClassName: "text-text-primary" },
];

export function StatsSection(props: StatsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section aria-labelledby="stats-title" className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10 lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-primary-soft blur-3xl"
        />
        <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7" ref={ref}>
            <SectionHeading
              id="stats-title"
              eyebrow="Con số thật"
              title={
                <>
                  Bớt suy nghĩ.
                  <br />
                  Ăn ngon hơn mỗi ngày.
                </>
              }
              description="Thay vì lướt app giao hàng cả buổi trưa mà vẫn không chọn được, để máy random giúp bạn khám phá những quán ngon quanh Cần Thơ."
            />
            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-6 sm:gap-6">
              {STATS.map((stat) => (
                <div key={stat.key}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <CountUpNumber
                      target={props[stat.key]}
                      active={isInView}
                      suffix={stat.suffix}
                      className={`text-stat ${stat.toneClassName}`}
                    />
                    <p className="mt-1 text-xs sm:text-sm font-semibold text-text-secondary" aria-hidden>
                      {stat.label}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5">
            <LuckyWheel />
          </div>
        </div>
      </div>
    </section>
  );
}

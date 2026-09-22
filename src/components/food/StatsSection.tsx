"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StatsSectionProps {
  foodCount: number;
  restaurantCount: number;
  randomCount90d: number;
}

const COUNT_UP_MS = 1200;

/** Đếm 0 → target khi phần tử lọt vào viewport; hiện số ngay nếu reduced-motion. */
function useCountUp(target: number, active: boolean, reduceMotion: boolean) {
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      // Đồng bộ thẳng giá trị cuối khi user bật reduced-motion — không có animation
      // frame nào theo sau nên không tạo cascading render như hiệu ứng đếm bên dưới.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, reduceMotion]);

  return value;
}

function StatFigure({
  target,
  active,
  reduceMotion,
  suffix = "",
  toneClassName,
}: {
  target: number;
  active: boolean;
  reduceMotion: boolean;
  suffix?: string;
  toneClassName: string;
}) {
  const value = useCountUp(target, active, reduceMotion);
  return (
    <p className={`text-stat ${toneClassName}`}>
      {new Intl.NumberFormat("vi-VN").format(value)}
      {suffix}
    </p>
  );
}

export function StatsSection({ foodCount, restaurantCount, randomCount90d }: StatsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <section className="py-16">
      <div className="rounded-3xl bg-gradient-to-br from-soft-blue to-surface p-8 md:p-14 shadow-sm relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -bottom-12 w-80 h-80 rounded-full bg-primary-blue/10 blur-3xl"
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
          <div className="lg:col-span-8 space-y-4" ref={ref}>
            <span className="text-xs uppercase tracking-wider text-primary-blue font-bold">
              Nay Ăn Gì? bằng số
            </span>
            <h2 className="text-display-sm text-text-primary">Bớt suy nghĩ. Ăn ngon hơn.</h2>
            <p className="text-text-secondary max-w-2xl leading-relaxed">
              Mỗi ngày chúng ta đưa ra hàng chục quyết định liên quan đến đồ ăn. Nay Ăn Gì? sinh ra
              để giảm gánh nặng đó, giúp sinh viên và người trẻ ở Cần Thơ tìm ra bữa ăn ưng ý nhanh hơn.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <div className="space-y-1">
                <StatFigure
                  target={foodCount}
                  active={isInView}
                  reduceMotion={reduceMotion}
                  suffix="+"
                  toneClassName="text-primary-blue"
                />
                <p className="text-sm text-text-secondary">Món ăn đã duyệt tại Cần Thơ</p>
              </div>
              <div className="space-y-1">
                <StatFigure
                  target={restaurantCount}
                  active={isInView}
                  reduceMotion={reduceMotion}
                  suffix="+"
                  toneClassName="text-primary-pink"
                />
                <p className="text-sm text-text-secondary">Quán ăn đã xác minh</p>
              </div>
              <div className="space-y-1">
                <StatFigure
                  target={randomCount90d}
                  active={isInView}
                  reduceMotion={reduceMotion}
                  toneClassName="text-deep-blue"
                />
                <p className="text-sm text-text-secondary">Lượt random trong 90 ngày qua</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="p-6 rounded-2xl bg-surface shadow-xl text-center space-y-4 max-w-xs w-full">
              <div className="w-16 h-16 rounded-full bg-soft-blue mx-auto flex items-center justify-center text-primary-blue">
                <Lightbulb className="size-7" aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Không biết ăn gì?</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Đừng lo, chọn mức độ ăn rồi để tụi tui random giúp bạn.
                </p>
              </div>
              <Button href="/random" fullWidth leftIcon={<Zap className="size-4.5" aria-hidden />}>
                Thử một món ngay!
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

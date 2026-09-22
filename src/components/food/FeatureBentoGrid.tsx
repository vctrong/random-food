"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, ChefHat, History, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FeatureTile {
  href: string;
  icon: LucideIcon;
  tone: "blue" | "pink";
  title: string;
  description: string;
  span: string;
}

const FEATURES: FeatureTile[] = [
  {
    href: "/lich-su",
    icon: History,
    tone: "blue",
    title: "Lịch sử ăn uống",
    description: "Check-in mỗi lần ghé quán để tự động lưu lại những gì bạn đã ăn, xem lại bất cứ lúc nào.",
    span: "md:col-span-2",
  },
  {
    href: "/da-luu",
    icon: Bookmark,
    tone: "pink",
    title: "Món đã lưu",
    description: "Lưu nhanh món ưng ý để lần sau khỏi phải random lại từ đầu.",
    span: "md:col-span-1",
  },
  {
    href: "/mon-an",
    icon: MapPin,
    tone: "pink",
    title: "Bản đồ quán ăn",
    description: "Mỗi món gợi ý đều kèm vị trí quán thật trên bản đồ, xem đường đi chỉ với 1 chạm.",
    span: "md:col-span-1",
  },
  {
    href: "/dong-gop",
    icon: ChefHat,
    tone: "blue",
    title: "Cộng đồng đóng góp món",
    description: "Biết quán ngon nào chưa có trên NayAnGi? Đóng góp ngay — FoodReviewer sẽ kiểm duyệt trước khi công khai.",
    span: "md:col-span-2",
  },
];

const TONE_CLASSES = {
  blue: "bg-soft-blue text-primary-blue",
  pink: "bg-soft-pink text-primary-pink",
};

export function FeatureBentoGrid() {
  return (
    <section className="py-16">
      <div className="max-w-2xl mb-10">
        <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
          Tiện ích đi kèm
        </span>
        <h2 className="text-display-sm text-text-primary mt-1">
          Không chỉ random — đồng hành cả hành trình ăn uống
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map(({ href, icon: Icon, tone, title, description, span }, index) => (
          <motion.div
            key={href + title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={span}
          >
            <Link
              href={href}
              className="group h-full flex flex-col justify-between gap-6 rounded-2xl bg-surface p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${TONE_CLASSES[tone]}`}>
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-blue transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-blue">
                Khám phá
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

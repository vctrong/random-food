"use client";

import { motion } from "framer-motion";
import { Dices, Scale, Store } from "lucide-react";

const STEPS = [
  {
    icon: Scale,
    step: "BƯỚC 01",
    title: "Chọn gu thèm ăn",
    description: "Khám phá theo 4 kích cỡ dạ dày: Ăn vặt, Ăn bình thường, Ăn vừa vừa, hay Ăn lớn.",
    tone: "blue" as const,
  },
  {
    icon: Dices,
    step: "BƯỚC 02",
    title: "Nhấn nút Random",
    description: "Thuật toán chọn ngẫu nhiên trong tập món phù hợp mức độ và bộ lọc bạn đã chọn.",
    tone: "pink" as const,
  },
  {
    icon: Store,
    step: "BƯỚC 03",
    title: "Khám phá & thưởng thức",
    description: "Xem ngay địa chỉ quán trên bản đồ, ước lượng calo và lưu món để quay lại sau.",
    tone: "blue" as const,
  },
];

const TONE_CLASSES = {
  blue: "bg-soft-blue text-primary-blue",
  pink: "bg-soft-pink text-primary-pink",
};

export function HowItWorksSection() {
  return (
    <section className="py-16">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
        <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
          Quy trình thông minh
        </span>
        <h2 className="text-display-sm text-text-primary">Chỉ 3 bước để có ngay bữa ăn ưng ý</h2>
        <p className="text-text-secondary">
          Bớt suy nghĩ, ăn ngon hơn — biến quyết định ăn uống mỗi ngày thành niềm vui.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map(({ icon: Icon, step, title, description, tone }, index) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-surface p-6 md:p-8 shadow-sm space-y-4"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${TONE_CLASSES[tone]}`}>
              <Icon className="size-6" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-primary-blue">{step}</span>
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

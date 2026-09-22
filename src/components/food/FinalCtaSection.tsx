"use client";

import { motion } from "framer-motion";
import { Dice5, Heart, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FinalCtaSection() {
  return (
    <section className="relative py-16 text-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-soft-blue/70 to-transparent -z-10 rounded-3xl"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto px-4 space-y-6"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-soft-pink text-primary-pink">
          <UtensilsCrossed className="size-7" aria-hidden />
        </div>
        <h2 className="text-display-sm text-text-primary">Sẵn sàng tìm món ngon cho hôm nay?</h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          Một cú nhấn. Một gợi ý bất ngờ. Một bữa ăn ngon miệng đang chờ bạn ở Cần Thơ.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button href="/random" size="lg" leftIcon={<Dice5 className="size-5" aria-hidden />}>
            Khám phá món ngẫu nhiên ngay
          </Button>
          <Button href="/mon-an" variant="secondary" size="lg" leftIcon={<Heart className="size-5 text-primary-pink" aria-hidden />}>
            Xem món yêu thích
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Dice5, Flame, History, RefreshCw, Soup, Sparkles, Star, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatPriceRange } from "@/lib/utils";
import { FilterBar, type FilterOption } from "@/components/filters/FilterBar";
import { LoginGateModal } from "@/components/auth/LoginGateModal";

interface HeroSectionProps {
  categories: { id: string; name: string }[];
  demoFoods: Food[];
}

const AUTO_ROTATE_MS = 5200;

export function HeroSection({ categories, demoFoods }: HeroSectionProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const prefersReducedMotion = useReducedMotion();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [demoIndex, setDemoIndex] = useState(0);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);

  const categoryOptions: FilterOption[] = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.name, icon: Soup })),
    [categories],
  );
  const randomHref = activeCategory ? `/random?category=${activeCategory}` : "/random";
  const demoFood = demoFoods[demoIndex] ?? null;

  const advanceDemo = () => setDemoIndex((prev) => (demoFoods.length > 0 ? (prev + 1) % demoFoods.length : 0));

  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (prefersReducedMotion || demoFoods.length <= 1) return;
    timerRef.current = window.setInterval(advanceDemo, AUTO_ROTATE_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion, demoFoods.length]);

  // Tilt nhẹ theo vị trí chuột — chỉ khi không bật reduced-motion.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 150, damping: 18 });
  const springY = useSpring(tiltY, { stiffness: 150, damping: 18 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    tiltX.set((event.clientX - rect.left) / rect.width - 0.5);
    tiltY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[640px] h-72 bg-gradient-to-tr from-soft-blue via-soft-pink to-transparent blur-3xl -z-10 rounded-full animate-blob-float"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -right-16 w-72 h-72 bg-soft-pink/70 blur-3xl -z-10 rounded-full animate-blob-float"
        style={{ animationDelay: "-4s" }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center pt-6 pb-12 md:pt-10 md:pb-16">
        {/* Text content */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface text-primary-blue shadow-sm mb-6">
            <Sparkles className="size-3.5" aria-hidden />
            <span className="text-sm font-medium tracking-wide">
              Giải pháp chống đau đầu giờ đói
            </span>
          </div>

          <h1 className="text-display text-text-primary mb-4">
            Hôm nay ăn gì?
            <br />
            <span className="bg-gradient-to-r from-primary-blue via-primary-blue to-primary-pink bg-clip-text text-transparent">
              Để tụi tui lo!
            </span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mb-8 leading-relaxed">
            Không cần suy nghĩ quá lâu. Chọn một kiểu thèm ăn và để chúng tôi đưa ra
            gợi ý chuẩn vị cho bạn trong tích tắc — dùng thử ngay cả khi chưa đăng nhập.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 w-full max-w-md lg:max-w-none">
            <Link
              href={randomHref}
              className="group relative flex-1 min-w-[180px] h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary-blue text-white font-semibold shadow-[0_8px_24px_-4px_rgba(91,158,235,0.42)] hover:shadow-xl hover:bg-[#4a8ddb] transition-all active:scale-95 overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-surface/30 opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer-sweep_0.9s_ease-out]" />
              <Dice5 className="size-5 group-hover:rotate-180 transition-transform duration-500" aria-hidden />
              <span>Random ngay</span>
            </Link>

            {isAuthenticated ? (
              <Link
                href="/lich-su"
                className="h-12 inline-flex items-center justify-center gap-2 px-6 rounded-full bg-surface hover:bg-soft-blue text-text-primary font-semibold shadow-sm transition-all active:scale-95"
              >
                <History className="size-4.5 text-text-secondary" aria-hidden />
                <span>Xem lịch sử</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginGateOpen(true)}
                className="h-12 inline-flex items-center justify-center gap-2 px-6 rounded-full bg-surface hover:bg-soft-blue text-text-primary font-semibold shadow-sm transition-all active:scale-95"
              >
                <UtensilsCrossed className="size-4.5 text-primary-pink" aria-hidden />
                <span>Đăng nhập với Google</span>
              </button>
            )}
          </div>

          {categoryOptions.length > 0 && (
            <FilterBar
              options={categoryOptions}
              value={activeCategory}
              onChange={setActiveCategory}
              className="justify-center lg:justify-start pt-6"
            />
          )}
        </div>

        {/* Interactive demo card */}
        <div className="lg:col-span-5 relative flex justify-center">
          {demoFood ? (
            <motion.div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ rotateX, rotateY, transformPerspective: 800 }}
              className="relative w-full max-w-md rounded-2xl bg-surface shadow-xl p-4"
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-soft-blue">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={demoFood.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    {demoFood.images[0] ? (
                      <Image
                        src={demoFood.images[0]}
                        alt={`Ảnh minh hoạ món ${demoFood.name}`}
                        fill
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        priority
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-blue">
                        <UtensilsCrossed className="size-16" aria-hidden />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/90 backdrop-blur-md shadow-sm">
                  <Flame className="size-3.5 text-primary-pink" aria-hidden />
                  <span className="text-xs font-semibold text-text-primary">Gợi ý ngẫu nhiên</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                  <div className="min-w-0">
                    <span className="text-xs uppercase tracking-wider text-white/80">
                      {demoFood.eatingLevels[0] ? EATING_LEVEL_LABELS[demoFood.eatingLevels[0]] : "Món ăn"}
                    </span>
                    <h3 className="font-heading text-2xl md:text-3xl drop-shadow-sm truncate tracking-wide">
                      {demoFood.name}
                    </h3>
                  </div>
                  {demoFood.ratingCount > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface/25 backdrop-blur-md text-sm font-semibold">
                      <Star className="size-3.5 fill-yellow-300 text-yellow-300" aria-hidden />
                      {demoFood.avgRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 pb-1 px-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-text-secondary text-sm">
                  {demoFood.restaurant && (
                    <span className="truncate max-w-[140px]">{demoFood.restaurant.name}</span>
                  )}
                </div>
                {demoFood.priceMin !== null && demoFood.priceMax !== null && (
                  <span className="font-bold text-primary-blue shrink-0">
                    {formatPriceRange(demoFood.priceMin, demoFood.priceMax)}
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 px-1 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-text-secondary">Dữ liệu món ăn thật từ hệ thống</span>
                </div>
                <button
                  type="button"
                  onClick={advanceDemo}
                  className="inline-flex items-center gap-1 text-primary-blue text-sm font-semibold hover:text-[#4a8ddb] transition-colors"
                >
                  <span>Đổi món khác</span>
                  <RefreshCw className="size-3.5" aria-hidden />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl p-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-soft-blue flex items-center justify-center text-primary-blue">
                <UtensilsCrossed className="size-6" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Chưa có món ăn nào</h3>
              <p className="text-sm text-text-secondary">
                Món ăn được cộng đồng đóng góp và kiểm duyệt sẽ xuất hiện tại đây.
              </p>
            </div>
          )}
        </div>
      </div>

      <LoginGateModal
        isOpen={isLoginGateOpen}
        onClose={() => setIsLoginGateOpen(false)}
        title="Đăng nhập để cá nhân hoá gợi ý món ăn"
        description="Lưu món yêu thích, xem lại lịch sử ăn uống và nhận gợi ý hợp khẩu vị hơn."
      />
    </section>
  );
}

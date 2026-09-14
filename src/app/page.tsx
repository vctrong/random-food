import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { HUNGER_LEVELS } from "@/constants/categories";
import { getFoodById } from "@/services/foodService";
import { getRecentHistory } from "@/services/historyService";
import { HeroRandomSection } from "@/components/food/HeroRandomSection";
import { HungerLevelCard } from "@/components/food/HungerLevelCard";
import { HistoryLogCard } from "@/components/food/HistoryLogCard";

export default function Home() {
  const recentHistory = getRecentHistory(4);

  return (
    <div className="w-full">
      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-4">
        <div
          aria-hidden
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[640px] h-64 bg-gradient-to-tr from-soft-blue via-soft-pink to-transparent blur-3xl pointer-events-none -z-10 rounded-full"
        />

        {/* Hero */}
        <section className="relative text-center max-w-2xl mx-auto pt-6 pb-12 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-primary-blue shadow-sm mb-6">
            <Sparkles className="size-3.5 animate-pulse" aria-hidden />
            <span className="text-sm font-medium tracking-wide">
              Giải pháp chống đau đầu giờ đói
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-4">
            Hôm nay ăn gì?
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mb-8 leading-relaxed">
            Không cần suy nghĩ quá lâu. Chọn một kiểu thèm ăn và để chúng tôi đưa ra
            gợi ý chuẩn vị cho bạn trong tích tắc.
          </p>

          <HeroRandomSection />
        </section>

        {/* Hunger levels */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
            <div>
              <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
                Mức độ bụng đói
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mt-1">
                Hôm nay bạn muốn ăn theo gu nào?
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              Nhấn để lọc theo kích thước khẩu phần
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HUNGER_LEVELS.map((level, index) => (
              <div
                key={level.id}
                className="animate-fade-slide-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <HungerLevelCard
                  config={level}
                  highlighted={level.id === "an-binh-thuong"}
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-soft-blue flex items-center justify-center text-primary-blue">
                  <CalendarDays className="size-4.5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Bạn đã ăn gì gần đây?
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Lịch sử các món bạn đã random hoặc đã chọn thưởng thức
                  </p>
                </div>
              </div>
              <Link
                href="/lich-su"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-blue hover:text-[#4a8ddb] transition-colors self-start sm:self-center"
              >
                <span>Xem toàn bộ lịch sử</span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentHistory.map((entry, index) => {
                const food = getFoodById(entry.foodId);
                if (!food) return null;
                return (
                  <div
                    key={entry.id}
                    className="animate-fade-slide-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <HistoryLogCard entry={entry} food={food} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

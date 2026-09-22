import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, CalendarDays } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Experience } from "@/lib/models/Experience";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Log } from "@/lib/models/Log";
import { EATING_LEVELS } from "@/constants/categories";
import { getAllFoods } from "@/services/foodService";
import { pickTopRatedByEatingLevel } from "@/features/random-food/randomLogic";
import { HeroSection } from "@/components/food/HeroSection";
import { HungerLevelCard } from "@/components/food/HungerLevelCard";
import { HowItWorksSection } from "@/components/food/HowItWorksSection";
import { PopularFoodsMarquee } from "@/components/food/PopularFoodsMarquee";
import { FeatureBentoGrid } from "@/components/food/FeatureBentoGrid";
import { StatsSection } from "@/components/food/StatsSection";
import { FinalCtaSection } from "@/components/food/FinalCtaSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const RANDOM_LOG_WINDOW_DAYS = 90;

export default async function Home() {
  const session = await getServerSession(authOptions);

  await connectDB();
  // Server Component chạy 1 lần mỗi request (không phải re-render như client) —
  // Date.now() ở đây an toàn, chỉ dùng để tính mốc lọc Log 90 ngày gần nhất.
  // eslint-disable-next-line react-hooks/purity
  const ninetyDaysAgo = new Date(Date.now() - RANDOM_LOG_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [experienceCount, foodCount, restaurantCount, randomCount90d] = await Promise.all([
    session?.user
      ? Experience.countDocuments({ userId: (session.user as { id: string }).id })
      : Promise.resolve(0),
    Food.countDocuments({ moderationStatus: "approved", visibility: "visible" }),
    Restaurant.countDocuments({ moderationStatus: "approved", visibility: "visible" }),
    Log.countDocuments({ action: "random", createdAt: { $gte: ninetyDaysAgo } }),
  ]);

  const allFoods = await getAllFoods();

  const categoryCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const food of allFoods) {
    for (const category of food.categories) {
      const entry = categoryCounts.get(category.id);
      if (entry) entry.count += 1;
      else categoryCounts.set(category.id, { id: category.id, name: category.name, count: 1 });
    }
  }
  const popularCategories = [...categoryCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(({ id, name }) => ({ id, name }));

  // Món rating cao nhất mỗi mức độ ăn — dùng chung cho demo card ở Hero (rút gọn 6
  // món đầu) và dải marquee "Món ăn nổi bật" (đủ 4-5 món/mức).
  const topRatedFoods = pickTopRatedByEatingLevel(allFoods, 5);

  return (
    <div className="w-full">
      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-4">
        <HeroSection categories={popularCategories} demoFoods={topRatedFoods.slice(0, 6)} />

        {/* Eating levels */}
        <section className="mb-4 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
            <div>
              <span className="text-xs uppercase tracking-widest text-primary-blue font-bold">
                Mức độ bụng đói
              </span>
              <h2 className="text-display-sm text-text-primary mt-1">Hôm nay bạn muốn ăn theo gu nào?</h2>
            </div>
            <p className="text-sm text-text-secondary">
              Nhấn để lọc theo kích thước khẩu phần
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EATING_LEVELS.map((level, index) => (
              <div
                key={level.id}
                className="animate-fade-slide-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <HungerLevelCard config={level} highlighted={level.id === "normal"} priority={index === 0} />
              </div>
            ))}
          </div>
        </section>

        <HowItWorksSection />
      </div>

      <PopularFoodsMarquee foods={topRatedFoods} />

      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <FeatureBentoGrid />
        <StatsSection
          foodCount={foodCount}
          restaurantCount={restaurantCount}
          randomCount90d={randomCount90d}
        />

        {/* Lịch sử cá nhân — chỉ có ý nghĩa khi đã đăng nhập, guest đã được dẫn dắt
            qua Hero/marquee/CTA cuối trang nên không lặp lại nội dung khám phá ở đây. */}
        {session?.user && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-soft-blue flex items-center justify-center text-primary-blue">
                <CalendarDays className="size-4.5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Bạn đã ăn gì gần đây?
                </h2>
                <p className="text-sm text-text-secondary">
                  Check-in tại quán để lưu lại trải nghiệm ăn uống của bạn
                </p>
              </div>
            </div>
            {experienceCount === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Chưa có trải nghiệm ăn uống nào"
                description="Random một món, ghé quán và quay lại đánh dấu đã ăn để lịch sử của bạn hiện ở đây."
                action={
                  <Button href="/random" size="sm">
                    Random ngay
                  </Button>
                }
              />
            ) : (
              <Link
                href="/lich-su"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-blue hover:text-[#4a8ddb] transition-colors"
              >
                <span>Xem toàn bộ lịch sử</span>
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </section>
        )}

        <FinalCtaSection />
      </div>
    </div>
  );
}

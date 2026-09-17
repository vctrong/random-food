import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, CalendarDays, Compass, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Experience } from "@/lib/models/Experience";
import { EATING_LEVELS } from "@/constants/categories";
import { getAllFoods } from "@/services/foodService";
import { HeroRandomSection } from "@/components/food/HeroRandomSection";
import { HungerLevelCard } from "@/components/food/HungerLevelCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const session = await getServerSession(authOptions);
  let experienceCount = 0;

  if (session?.user) {
    await connectDB();
    const userId = (session.user as { id: string }).id;
    experienceCount = await Experience.countDocuments({ userId });
  }

  const allFoods = await getAllFoods();
  const highlightFoods = allFoods.slice(0, 4);

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

          <HeroRandomSection categories={popularCategories} />
        </section>

        {/* Eating levels */}
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

        {/* Recent activity: cá nhân hoá cho user, highlight công khai cho guest */}
        <section className="mb-8">
          {session?.user ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-soft-pink flex items-center justify-center text-primary-pink">
                    <Compass className="size-4.5" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      Món ăn nổi bật hôm nay
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Đăng ký để lưu món yêu thích và xem lại lịch sử ăn uống của bạn
                    </p>
                  </div>
                </div>
                <Button href="/dang-ky" variant="secondary" size="sm">
                  Đăng ký miễn phí
                </Button>
              </div>

              {highlightFoods.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="Chưa có món ăn nào"
                  description="Món ăn được cộng đồng đóng góp và kiểm duyệt sẽ xuất hiện tại đây."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {highlightFoods.map((food, index) => (
                    <Link
                      key={food.id}
                      href={food.categories[0] ? `/random?category=${food.categories[0].id}` : "/random"}
                      className="animate-fade-slide-up bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <p className="font-semibold text-text-primary truncate">{food.name}</p>
                      <p className="text-sm text-text-secondary truncate">
                        {food.restaurant?.name ?? "Chưa rõ quán"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getAllFoods } from "@/services/foodService";
import { BRAND } from "@/constants/brand";
import { SITE_URL } from "@/config/env";
import { getLandingStats, getLatestReviewQuotes } from "@/lib/landing";
import { pickTopRatedByEatingLevel, pickTopRatedPerLevel } from "@/features/random-food/randomLogic";
import { LandingRandomProvider } from "@/features/random-food/LandingRandomProvider";
import { HeroSection } from "@/components/food/HeroSection";
import { FoodTicker } from "@/components/food/FoodTicker";
import { HungerLevelSection } from "@/components/food/HungerLevelSection";
import { HowItWorksSection } from "@/components/food/HowItWorksSection";
import { TopRatedPolaroidSection } from "@/components/food/TopRatedPolaroidSection";
import { FeatureBentoGrid } from "@/components/food/FeatureBentoGrid";
import { StatsSection } from "@/components/food/StatsSection";
import { FinalCtaSection } from "@/components/food/FinalCtaSection";

const HOME_TITLE = `${BRAND.seoName} – Hôm nay ăn gì? Random món ngon Cần Thơ`;
const HOME_DESCRIPTION =
  "NayAnGi giúp bạn trả lời câu hỏi “hôm nay ăn gì?” chỉ với một lần gạt cần: random món ăn và quán ngon ở Cần Thơ theo gu, mức đói và túi tiền, kèm chỉ đường tới quán.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/", siteName: BRAND.seoName, locale: "vi_VN", type: "website" },
};

/** Dữ liệu cấu trúc WebSite — giúp Google hiển thị đúng tên site và nhận trang chủ là trang chính. */
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND.seoName,
  alternateName: [BRAND.name, "nayangi.io.vn"],
  url: `${SITE_URL}/`,
};

export default async function Home() {
  const [allFoods, stats] = await Promise.all([getAllFoods(), getLandingStats()]);

  const topRatedPerLevel = pickTopRatedPerLevel(allFoods);
  const reviewQuotes = await getLatestReviewQuotes(topRatedPerLevel.map(({ food }) => food.id));

  return (
    <div className="w-full overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
      <LandingRandomProvider allFoods={allFoods}>
        <HeroSection foodCount={stats.foodCount} />
        <FoodTicker
          foods={pickTopRatedByEatingLevel(allFoods, 5)}
          foodCount={stats.foodCount}
          restaurantCount={stats.restaurantCount}
          randomCount90d={stats.randomCount90d}
        />
        <HungerLevelSection />
        <HowItWorksSection />
        <TopRatedPolaroidSection items={topRatedPerLevel} quotes={reviewQuotes} foodCount={stats.foodCount} />
        <FeatureBentoGrid restaurantCount={stats.restaurantCount} />
        <StatsSection
          foodCount={stats.foodCount}
          restaurantCount={stats.restaurantCount}
          randomCount90d={stats.randomCount90d}
        />
        <FinalCtaSection />
      </LandingRandomProvider>
    </div>
  );
}

import { getAllFoods } from "@/services/foodService";
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

export default async function Home() {
  const [allFoods, stats] = await Promise.all([getAllFoods(), getLandingStats()]);

  const topRatedPerLevel = pickTopRatedPerLevel(allFoods);
  const reviewQuotes = await getLatestReviewQuotes(topRatedPerLevel.map(({ food }) => food.id));

  return (
    <div className="w-full overflow-x-clip">
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

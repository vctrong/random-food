import { getAllFoods } from "@/services/foodService";
import { EATING_LEVEL_ORDER } from "@/constants/categories";
import type { EatingLevel } from "@/types/food";
import { FoodListPageContent } from "@/components/food/FoodListPageContent";

export const dynamic = "force-dynamic";

/** `?muc=snack|normal|hearty|full` — mở sẵn bộ lọc mức ăn (link từ mega menu / ghe ở footer). */
export default async function FoodListPage({ searchParams }: PageProps<"/mon-an">) {
  const [foods, { muc }] = await Promise.all([getAllFoods(), searchParams]);
  const initialEatingLevel = EATING_LEVEL_ORDER.find((level): level is EatingLevel => level === muc);

  return <FoodListPageContent key={initialEatingLevel ?? "all"} initialFoods={foods} initialEatingLevel={initialEatingLevel} />;
}

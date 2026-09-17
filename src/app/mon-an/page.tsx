import { getAllFoods } from "@/services/foodService";
import { FoodListPageContent } from "@/components/food/FoodListPageContent";

export const dynamic = "force-dynamic";

export default async function FoodListPage() {
  const foods = await getAllFoods();

  return <FoodListPageContent initialFoods={foods} />;
}

import { notFound } from "next/navigation";
import { getAllFoods } from "@/services/foodService";
import { FoodDetailPageContent } from "@/components/food/FoodDetailPageContent";

export const dynamic = "force-dynamic";

export default async function FoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allFoods = await getAllFoods();
  const food = allFoods.find((item) => item.id === id);
  if (!food) notFound();

  const similarFoods = allFoods
    .filter((item) => item.id !== food.id && item.categories.some((c) => food.categories.some((fc) => fc.id === c.id)))
    .slice(0, 3);

  return <FoodDetailPageContent food={food} similarFoods={similarFoods} />;
}

import { getAllFoods } from "@/services/foodService";
import { getSavedFoodRecords } from "@/services/savedFoodService";
import { SavedFoodsPageContent } from "@/components/food/SavedFoodsPageContent";

export default function SavedFoodsPage() {
  const allFoods = getAllFoods();
  const initialRecords = getSavedFoodRecords();

  return <SavedFoodsPageContent initialRecords={initialRecords} allFoods={allFoods} />;
}

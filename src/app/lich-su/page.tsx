import { getAllFoods } from "@/services/foodService";
import { getAllHistory } from "@/services/historyService";
import { HistoryPageContent } from "@/components/food/HistoryPageContent";

export default function HistoryPage() {
  const allFoods = getAllFoods();
  const historyEntries = getAllHistory();

  return (
    <HistoryPageContent
      initialEntries={historyEntries}
      allFoods={allFoods}
      totalFoodsInMenu={allFoods.length}
    />
  );
}

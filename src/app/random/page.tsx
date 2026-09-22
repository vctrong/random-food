import { getAllFoods } from "@/services/foodService";
import { RandomFoodResult } from "@/components/food/RandomFoodResult";
import { filterFoods, pickRandomFood } from "@/features/random-food/randomLogic";
import { isEatingLevel } from "@/constants/categories";

export default async function RandomPage(props: PageProps<"/random">) {
  const searchParams = await props.searchParams;
  const mucDo = searchParams["muc-do"];
  const rawEatingLevel = Array.isArray(mucDo) ? mucDo[0] : (mucDo ?? null);
  const eatingLevel = rawEatingLevel && isEatingLevel(rawEatingLevel) ? rawEatingLevel : null;

  const categoryParam = searchParams["category"];
  const categoryId = Array.isArray(categoryParam) ? categoryParam[0] : (categoryParam ?? null);

  const allFoods = await getAllFoods();

  // Tính sẵn kết quả random ĐẦU TIÊN trên server và truyền xuống làm prop —
  // tránh gọi Math.random() lại trong lúc client hydrate (gây hydration mismatch
  // vì server và client sẽ ra 2 kết quả ngẫu nhiên khác nhau).
  const pool = filterFoods(allFoods, {
    eatingLevel,
    categoryIds: categoryId ? [categoryId] : [],
    tags: [],
  });
  const initialFood = pickRandomFood(pool);

  return (
    <div className="w-full">
      <RandomFoodResult
        allFoods={allFoods}
        eatingLevel={eatingLevel}
        categoryId={categoryId}
        initialFood={initialFood}
      />
    </div>
  );
}

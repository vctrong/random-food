import { getAllFoods } from "@/services/foodService";
import { RandomFoodResult } from "@/components/food/RandomFoodResult";
import { filterFoods, pickAlternatives, pickRandomFood } from "@/features/random-food/randomLogic";
import { isHungerLevel } from "@/constants/categories";

const ALTERNATIVES_COUNT = 3;

export default async function RandomPage(props: PageProps<"/random">) {
  const searchParams = await props.searchParams;
  const mucDo = searchParams["muc-do"];
  const rawHungerLevelId = Array.isArray(mucDo) ? mucDo[0] : (mucDo ?? null);
  const hungerLevel = rawHungerLevelId && isHungerLevel(rawHungerLevelId) ? rawHungerLevelId : null;

  const allFoods = getAllFoods();

  // Tính sẵn kết quả random ĐẦU TIÊN trên server và truyền xuống làm prop —
  // tránh gọi Math.random() lại trong lúc client hydrate (gây hydration mismatch
  // vì server và client sẽ ra 2 kết quả ngẫu nhiên khác nhau).
  const pool = filterFoods(allFoods, {
    hungerLevel,
    noSpice: false,
    vegetarianOnly: false,
    under50k: false,
  });
  const initialFood = pickRandomFood(pool);
  const initialAlternatives = initialFood
    ? pickAlternatives(pool, initialFood.id, ALTERNATIVES_COUNT)
    : [];

  return (
    <div className="w-full">
      <RandomFoodResult
        allFoods={allFoods}
        hungerLevel={hungerLevel}
        initialFood={initialFood}
        initialAlternatives={initialAlternatives}
      />
    </div>
  );
}

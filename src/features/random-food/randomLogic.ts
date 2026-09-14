import type { Food, HungerLevel } from "@/types/food";

export interface RandomFilters {
  hungerLevel: HungerLevel | null;
  noSpice: boolean;
  vegetarianOnly: boolean;
  under50k: boolean;
}

/** Lọc pool món ăn theo bộ lọc hiện tại. Hàm thuần, không side effect. */
export function filterFoods(foods: Food[], filters: RandomFilters): Food[] {
  return foods.filter((food) => {
    if (filters.hungerLevel && food.hungerLevel !== filters.hungerLevel) return false;
    if (filters.noSpice && food.spiceLevel !== "khong-cay") return false;
    if (filters.vegetarianOnly && !food.isVegetarian) return false;
    if (filters.under50k && food.priceMax > 50000) return false;
    return true;
  });
}

/**
 * Chọn ngẫu nhiên 1 món trong pool, loại trừ `excludeId` nếu pool còn món khác để chọn.
 * Nếu pool rỗng, trả về null.
 */
export function pickRandomFood(pool: Food[], excludeId?: string | null): Food | null {
  if (pool.length === 0) return null;
  const candidates = excludeId ? pool.filter((food) => food.id !== excludeId) : pool;
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
}

/** Chọn ngẫu nhiên `count` món khác làm phương án dự phòng. */
export function pickAlternatives(pool: Food[], excludeId: string, count: number): Food[] {
  const candidates = pool.filter((food) => food.id !== excludeId);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

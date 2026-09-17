import type { EatingLevel, Food } from "@/types/food";

export interface RandomFilters {
  eatingLevel: EatingLevel | null;
  categoryIds: string[];
  tags: string[];
}

/**
 * Lọc pool món ăn theo bộ lọc hiện tại. Hàm thuần, không side effect.
 * Các nhóm filter đa chọn (categoryIds/tags) khớp kiểu OR trong cùng nhóm,
 * AND giữa các nhóm khác nhau — nhóm rỗng nghĩa là không lọc theo nhóm đó.
 */
export function filterFoods(foods: Food[], filters: RandomFilters): Food[] {
  return foods.filter((food) => {
    if (filters.eatingLevel && !food.eatingLevels.includes(filters.eatingLevel)) return false;
    if (
      filters.categoryIds.length > 0 &&
      !food.categories.some((category) => filters.categoryIds.includes(category.id))
    ) {
      return false;
    }
    if (filters.tags.length > 0 && !filters.tags.some((tag) => food.tags.includes(tag))) return false;
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

import type { Food, FoodCategory } from "@/types/food";
import type { SavedFoodRecord } from "@/data/savedFoods";

export interface SavedFood extends SavedFoodRecord {
  food: Food;
}

export type SavedSortOrder = "recent" | "name-asc" | "price-asc" | "price-desc";

/** Ghép record đã lưu với Food tương ứng, bỏ qua món không còn tồn tại trong thực đơn. */
export function joinSavedWithFood(records: SavedFoodRecord[], foods: Food[]): SavedFood[] {
  const foodMap = new Map(foods.map((food) => [food.id, food]));
  return records
    .map((record) => {
      const food = foodMap.get(record.foodId);
      return food ? { ...record, food } : null;
    })
    .filter((item): item is SavedFood => item !== null);
}

export function filterAndSortSaved(
  saved: SavedFood[],
  { search, category, sortOrder }: { search: string; category: FoodCategory | "all"; sortOrder: SavedSortOrder },
): SavedFood[] {
  const keyword = search.trim().toLowerCase();

  const filtered = saved.filter((item) => {
    if (keyword && !item.food.name.toLowerCase().includes(keyword)) return false;
    if (category !== "all" && item.food.category !== category) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (sortOrder) {
      case "name-asc":
        return a.food.name.localeCompare(b.food.name, "vi");
      case "price-asc":
        return a.food.priceMin - b.food.priceMin;
      case "price-desc":
        return b.food.priceMax - a.food.priceMax;
      case "recent":
      default:
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    }
  });
}

export interface SavedStats {
  totalCount: number;
  avgCalories: number;
  priceRangeLabel: string;
  categoryDiversityLabel: string;
}

/** Toàn bộ số liệu tính trực tiếp từ danh sách đã lưu hiện có — không có số ước lượng. */
export function computeSavedStats(saved: SavedFood[], totalCategoriesAvailable: number): SavedStats {
  const totalCount = saved.length;
  if (totalCount === 0) {
    return { totalCount: 0, avgCalories: 0, priceRangeLabel: "—", categoryDiversityLabel: "—" };
  }

  const avgCalories = Math.round(
    saved.reduce((sum, item) => sum + item.food.calories, 0) / totalCount,
  );
  const minPrice = Math.min(...saved.map((item) => item.food.priceMin));
  const maxPrice = Math.max(...saved.map((item) => item.food.priceMax));
  const uniqueCategories = new Set(saved.map((item) => item.food.category)).size;

  return {
    totalCount,
    avgCalories,
    priceRangeLabel: `${Math.round(minPrice / 1000)}k – ${Math.round(maxPrice / 1000)}k`,
    categoryDiversityLabel: `${uniqueCategories}/${totalCategoriesAvailable} loại món`,
  };
}

export function pickRandomSavedFood(saved: SavedFood[], excludeFoodId?: string | null): Food | null {
  if (saved.length === 0) return null;
  const candidates = excludeFoodId ? saved.filter((s) => s.foodId !== excludeFoodId) : saved;
  const source = candidates.length > 0 ? candidates : saved;
  return source[Math.floor(Math.random() * source.length)].food;
}

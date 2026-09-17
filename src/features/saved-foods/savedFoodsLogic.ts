import type { Food } from "@/types/food";
import type { SavedFoodRecord } from "@/services/savedFoodService";

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
  { search, categoryId, sortOrder }: { search: string; categoryId: string | "all"; sortOrder: SavedSortOrder },
): SavedFood[] {
  const keyword = search.trim().toLowerCase();

  const filtered = saved.filter((item) => {
    if (keyword && !item.food.name.toLowerCase().includes(keyword)) return false;
    if (categoryId !== "all" && !item.food.categories.some((c) => c.id === categoryId)) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (sortOrder) {
      case "name-asc":
        return a.food.name.localeCompare(b.food.name, "vi");
      case "price-asc":
        return (a.food.priceMin ?? 0) - (b.food.priceMin ?? 0);
      case "price-desc":
        return (b.food.priceMax ?? 0) - (a.food.priceMax ?? 0);
      case "recent":
      default:
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    }
  });
}

export interface SavedStats {
  totalCount: number;
  avgCalories: number | null;
  priceRangeLabel: string;
  categoryDiversityLabel: string;
}

/** Toàn bộ số liệu tính trực tiếp từ danh sách đã lưu hiện có — không có số ước lượng. */
export function computeSavedStats(saved: SavedFood[], totalCategoriesAvailable: number): SavedStats {
  const totalCount = saved.length;
  if (totalCount === 0) {
    return { totalCount: 0, avgCalories: null, priceRangeLabel: "—", categoryDiversityLabel: "—" };
  }

  const caloriesMidpoints = saved
    .map((item) =>
      item.food.caloriesMin !== null && item.food.caloriesMax !== null
        ? (item.food.caloriesMin + item.food.caloriesMax) / 2
        : null,
    )
    .filter((value): value is number => value !== null);
  const avgCalories =
    caloriesMidpoints.length > 0
      ? Math.round(caloriesMidpoints.reduce((sum, value) => sum + value, 0) / caloriesMidpoints.length)
      : null;

  const prices = saved.flatMap((item) =>
    item.food.priceMin !== null && item.food.priceMax !== null ? [item.food.priceMin, item.food.priceMax] : [],
  );
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const uniqueCategories = new Set(saved.flatMap((item) => item.food.categories.map((c) => c.id))).size;

  return {
    totalCount,
    avgCalories,
    priceRangeLabel: prices.length > 0 ? `${Math.round(minPrice / 1000)}k – ${Math.round(maxPrice / 1000)}k` : "—",
    categoryDiversityLabel: `${uniqueCategories}/${totalCategoriesAvailable} loại món`,
  };
}

export function pickRandomSavedFood(saved: SavedFood[], excludeFoodId?: string | null): Food | null {
  if (saved.length === 0) return null;
  const candidates = excludeFoodId ? saved.filter((s) => s.foodId !== excludeFoodId) : saved;
  const source = candidates.length > 0 ? candidates : saved;
  return source[Math.floor(Math.random() * source.length)].food;
}

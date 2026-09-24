import type { EatingLevel, Food } from "@/types/food";
import type { SpicePreference } from "@/types/settings";

export interface RandomFilters {
  eatingLevel: EatingLevel | null;
  categoryIds: string[];
  tags: string[];
  /**
   * Chip "Dưới 30k" ở landing: giữ món có giá khởi điểm (priceMin) không vượt
   * mức này — tức là ăn được trong tầm tiền đó. Món chưa có giá bị loại vì không
   * xác nhận được. Bỏ trống/null = không lọc giá.
   */
  maxPrice?: number | null;
}

export interface PersonalPreferences {
  dislikedIngredients: string[];
  vegetarianMode: boolean;
  spicePreference: SpicePreference | null;
  priceRange: { min: number; max?: number } | null;
  allowRepeatWithin24h: boolean;
}

function foodTextHaystack(food: Food): string {
  return [food.name, food.description, ...food.tags].join(" ").toLowerCase();
}

/**
 * Áp sở thích cá nhân (Hồ sơ → Sở thích ăn uống) vào pool random thật.
 *
 * GIỚI HẠN QUAN TRỌNG: Food hiện KHÔNG có field riêng cho "món chay" hay "mức độ
 * cay" trong schema (docs/database.md mục 4) — chỉ có `tags` tự do (vd "cay",
 * "chay" nếu người đóng góp tự gắn). Vegetarian/dị ứng/độ cay ở đây dùng cách dò
 * chuỗi (tên + mô tả + tags) làm giải pháp tạm, KHÔNG chính xác 100% — món thiếu
 * tag phù hợp có thể lọt qua dù đúng loại. Muốn chính xác cần thêm field
 * `isVegetarian`/`spiceLevel` vào Food schema (đổi schema — cần hỏi trước theo
 * CLAUDE.md mục 6).
 *
 * Dị ứng/chay là filter CỨNG (an toàn ăn uống, không nới lỏng dù pool rỗng).
 * Giá/không-lặp-24h là filter MỀM: nếu áp vào làm pool rỗng thì bỏ qua riêng
 * điều kiện đó thay vì trả về rỗng — đúng tinh thần BR-R06 (ưu tiên vẫn có gợi ý).
 */
export function applyPersonalPreferences(
  foods: Food[],
  prefs: PersonalPreferences,
  recentFoodIds: string[] = [],
): Food[] {
  const hardFiltered = foods.filter((food) => {
    const haystack = foodTextHaystack(food);
    if (
      prefs.dislikedIngredients.some(
        (term) => term.trim().length > 0 && haystack.includes(term.trim().toLowerCase()),
      )
    ) {
      return false;
    }
    if (prefs.vegetarianMode && !haystack.includes("chay")) return false;
    if (prefs.spicePreference === "khong-cay" && haystack.includes("cay")) return false;
    return true;
  });

  let result = hardFiltered;

  if (prefs.priceRange) {
    const prefMin = prefs.priceRange.min;
    const prefMax = prefs.priceRange.max ?? Infinity;
    const byPrice = result.filter((food) => {
      const foodMin = food.priceMin ?? 0;
      const foodMax = food.priceMax ?? Infinity;
      return foodMax >= prefMin && foodMin <= prefMax;
    });
    if (byPrice.length > 0) result = byPrice;
  }

  if (!prefs.allowRepeatWithin24h && recentFoodIds.length > 0) {
    const byRecent = result.filter((food) => !recentFoodIds.includes(food.id));
    if (byRecent.length > 0) result = byRecent;
  }

  return result;
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
    if (filters.maxPrice != null && (food.priceMin === null || food.priceMin > filters.maxPrice)) return false;
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
export interface RelatedFoodsResult {
  /** "same-restaurant" | "same-category" | "none" — để UI hiển thị đúng tiêu đề/mô tả. */
  reason: "same-restaurant" | "same-category" | "none";
  foods: Food[];
}

/**
 * Món liên quan tới `currentFood` — thay cho "phương án dự phòng" random cũ
 * (pickAlternatives) vốn bị phản hồi là khó hiểu: 3 món ngẫu nhiên không rõ vì
 * sao lại xuất hiện, đổi liên tục mỗi lần đổi bộ lọc.
 *
 * Ưu tiên món KHÁC tại CÙNG QUÁN (rõ lý do xuất hiện — "đằng nào cũng ghé quán
 * này rồi, còn món gì ngon khác không"), fallback sang món cùng danh mục nếu
 * quán chỉ có đúng 1 món. Hàm thuần, tất định — cùng input luôn ra cùng output,
 * không còn rủi ro lệch server/client như bản random trước.
 */
export function pickRelatedFoods(allFoods: Food[], currentFood: Food, count = 3): RelatedFoodsResult {
  if (currentFood.restaurant) {
    const sameRestaurant = allFoods.filter(
      (food) => food.id !== currentFood.id && food.restaurant?.id === currentFood.restaurant?.id,
    );
    if (sameRestaurant.length > 0) {
      return { reason: "same-restaurant", foods: sameRestaurant.slice(0, count) };
    }
  }

  const currentCategoryIds = new Set(currentFood.categories.map((category) => category.id));
  const sameCategory = allFoods.filter(
    (food) => food.id !== currentFood.id && food.categories.some((category) => currentCategoryIds.has(category.id)),
  );
  if (sameCategory.length > 0) {
    return { reason: "same-category", foods: sameCategory.slice(0, count) };
  }

  return { reason: "none", foods: [] };
}

const EATING_LEVEL_ORDER: EatingLevel[] = ["snack", "normal", "hearty", "full"];

/**
 * Chọn món rating cao nhất của TỪNG mức độ ăn (cho landing page "món nổi bật") —
 * mỗi mức lấy tối đa `perLevel` món, xếp theo avgRating rồi ratingCount. Một món
 * có thể thuộc nhiều eatingLevels nên nếu đã được chọn ở mức trước, bỏ qua và lấy
 * tiếp món kế tiếp trong danh sách để mỗi mức vẫn đủ số lượng (không trùng lặp).
 */
export function pickTopRatedByEatingLevel(foods: Food[], perLevel = 5): Food[] {
  const picked = new Map<string, Food>();

  for (const level of EATING_LEVEL_ORDER) {
    const candidates = foods
      .filter((food) => food.eatingLevels.includes(level) && !picked.has(food.id))
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);

    for (const food of candidates.slice(0, perLevel)) {
      picked.set(food.id, food);
    }
  }

  return [...picked.values()];
}

/**
 * Mỗi mức độ ăn lấy đúng 1 món rating cao nhất (không trùng món giữa các mức) —
 * trả kèm mức độ mà món đại diện, cho thẻ "Rating cao nhất mỗi kiểu thèm ăn".
 * Mức nào không có món thì bỏ qua.
 */
export function pickTopRatedPerLevel(foods: Food[]): { level: EatingLevel; food: Food }[] {
  const pickedIds = new Set<string>();
  const result: { level: EatingLevel; food: Food }[] = [];

  for (const level of EATING_LEVEL_ORDER) {
    const best = foods
      .filter((food) => food.eatingLevels.includes(level) && !pickedIds.has(food.id))
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)[0];
    if (best) {
      pickedIds.add(best.id);
      result.push({ level, food: best });
    }
  }

  return result;
}

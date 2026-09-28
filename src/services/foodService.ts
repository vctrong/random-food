import type { Food } from "@/types/food";

/**
 * Lớp duy nhất "biết" data món ăn đến từ đâu — gọi qua API route `/api/foods`
 * (dữ liệu thật từ MongoDB), không import trực tiếp từ `lib/models/` trong
 * component (mục 1 CLAUDE.md).
 */

export async function getAllFoods(): Promise<Food[]> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/foods`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as Food[];
  } catch {
    return [];
  }
}

/**
 * Món còn "đi ăn được": bỏ món của quán đã đóng cửa (BR-M12) — dùng cho random,
 * danh sách /mon-an và tìm kiếm. Trang chi tiết / Đã lưu / Lịch sử vẫn dùng getAllFoods.
 */
export function excludeClosedRestaurants(foods: Food[]): Food[] {
  return foods.filter((food) => !food.restaurant?.isClosed);
}

export async function getOpenFoods(): Promise<Food[]> {
  return excludeClosedRestaurants(await getAllFoods());
}

export async function getFoodById(id: string): Promise<Food | undefined> {
  const foods = await getAllFoods();
  return foods.find((food) => food.id === id);
}

/** Bản gọi từ trình duyệt (URL tương đối) — vd mini random ở footer. Đã bỏ món của quán đóng cửa. */
export async function getAllFoodsFromClient(): Promise<Food[]> {
  try {
    const response = await fetch("/api/foods");
    if (!response.ok) return [];
    return excludeClosedRestaurants((await response.json()) as Food[]);
  } catch {
    return [];
  }
}

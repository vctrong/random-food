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

export async function getFoodById(id: string): Promise<Food | undefined> {
  const foods = await getAllFoods();
  return foods.find((food) => food.id === id);
}

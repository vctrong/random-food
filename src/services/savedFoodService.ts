/**
 * Lớp duy nhất "biết" data món đã lưu đến từ đâu — gọi qua API route
 * `/api/favorites` (dữ liệu thật từ MongoDB, gắn theo tài khoản), không còn
 * dùng localStorage. Chỉ dùng ở phía client ("use client" hooks/component) —
 * fetch tương đối hoạt động nhờ cùng origin trong trình duyệt.
 */

export interface SavedFoodRecord {
  foodId: string;
  /** ISO datetime lúc lưu món. */
  savedAt: string;
}

interface FavoriteApiRecord {
  id: string;
  foodId: string;
  createdAt: string;
}

export async function getSavedFoodRecords(): Promise<SavedFoodRecord[]> {
  try {
    const response = await fetch("/api/favorites", { cache: "no-store" });
    if (!response.ok) return [];
    const favorites = (await response.json()) as FavoriteApiRecord[];
    return favorites.map((favorite) => ({ foodId: favorite.foodId, savedAt: favorite.createdAt }));
  } catch {
    return [];
  }
}

export async function addSavedFood(foodId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeSavedFood(foodId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/favorites/${encodeURIComponent(foodId)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

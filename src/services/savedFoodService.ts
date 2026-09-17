/**
 * Lớp duy nhất "biết" data món đã lưu đến từ đâu. Lưu/bỏ lưu được ghi vào
 * localStorage của trình duyệt (chưa nối với collection `favorites` thật —
 * xem ghi chú ở src/app/api/favorites/route.ts). Trên server (SSR) không có
 * localStorage nên luôn trả về mảng rỗng — component client tự đồng bộ lại
 * dữ liệu thật ngay sau khi mount.
 */

export interface SavedFoodRecord {
  foodId: string;
  /** ISO datetime lúc lưu món. */
  savedAt: string;
}

const STORAGE_KEY = "homnayangi:saved-foods";

function readStorage(): SavedFoodRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFoodRecord[]) : null;
  } catch {
    return null;
  }
}

function writeStorage(records: SavedFoodRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage (vd: chế độ riêng tư).
  }
}

function readRecords(): SavedFoodRecord[] {
  return readStorage() ?? [];
}

export function getSavedFoodRecords(): SavedFoodRecord[] {
  return readRecords();
}

export function isFoodSaved(foodId: string): boolean {
  return readRecords().some((record) => record.foodId === foodId);
}

export function addSavedFood(foodId: string): void {
  const current = readRecords();
  if (current.some((record) => record.foodId === foodId)) return;
  writeStorage([{ foodId, savedAt: new Date().toISOString() }, ...current]);
}

export function removeSavedFood(foodId: string): void {
  writeStorage(readRecords().filter((record) => record.foodId !== foodId));
}

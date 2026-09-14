import { MOCK_SAVED_FOODS, type SavedFoodRecord } from "@/data/savedFoods";

/**
 * Lớp duy nhất "biết" data món đã lưu đến từ đâu.
 * Hiện tại: seed từ mock, nhưng lưu/bỏ lưu thật được ghi vào localStorage của trình
 * duyệt (chưa có backend). Trên server (SSR) không có localStorage nên luôn trả về
 * seed mock gốc — component client sẽ tự đồng bộ lại dữ liệu thật ngay sau khi mount.
 */

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

function readRecordsOrSeed(): SavedFoodRecord[] {
  return readStorage() ?? MOCK_SAVED_FOODS;
}

export function getSavedFoodRecords(): SavedFoodRecord[] {
  return readRecordsOrSeed();
}

export function isFoodSaved(foodId: string): boolean {
  return readRecordsOrSeed().some((record) => record.foodId === foodId);
}

export function addSavedFood(foodId: string): void {
  const current = readRecordsOrSeed();
  if (current.some((record) => record.foodId === foodId)) return;
  writeStorage([{ foodId, savedAt: new Date().toISOString() }, ...current]);
}

export function removeSavedFood(foodId: string): void {
  writeStorage(readRecordsOrSeed().filter((record) => record.foodId !== foodId));
}

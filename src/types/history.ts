import type { EatingLevel } from "./food";

export interface HistoryEntry {
  id: string;
  foodId: string;
  /** ISO datetime của lần random/chọn món */
  timestamp: string;
  eatingLevel: EatingLevel | null;
  /** Đã đánh dấu là ăn món này thật hay chỉ mới random ra */
  wasEaten: boolean;
  isSaved: boolean;
}

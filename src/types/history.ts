import type { HungerLevel } from "./food";

export interface HistoryEntry {
  id: string;
  foodId: string;
  /** ISO datetime của lần random/chọn món */
  timestamp: string;
  hungerLevel: HungerLevel;
  /** Đã đánh dấu là ăn món này thật hay chỉ mới random ra */
  wasEaten: boolean;
  isSaved: boolean;
}

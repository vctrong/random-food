import type { EatingLevel, Food } from "@/types/food";
import type { HistoryEntry } from "@/types/history";
import { EATING_LEVEL_LABELS } from "@/constants/categories";

export interface HistoryWithFood extends HistoryEntry {
  food: Food;
}

export type QuickFilter = "all" | "saved" | "eaten";
export type SortOrder = "newest" | "oldest";

export interface HistoryFilters {
  search: string;
  eatingLevel: EatingLevel | "all";
  quickFilter: QuickFilter;
  sortOrder: SortOrder;
}

/** Ghép HistoryEntry với Food tương ứng, bỏ qua entry nào không còn tìm thấy món (an toàn dữ liệu). */
export function joinHistoryWithFood(entries: HistoryEntry[], foods: Food[]): HistoryWithFood[] {
  const foodMap = new Map(foods.map((food) => [food.id, food]));
  return entries
    .map((entry) => {
      const food = foodMap.get(entry.foodId);
      return food ? { ...entry, food } : null;
    })
    .filter((entry): entry is HistoryWithFood => entry !== null);
}

export function filterAndSortHistory(
  entries: HistoryWithFood[],
  filters: HistoryFilters,
): HistoryWithFood[] {
  const keyword = filters.search.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (keyword && !entry.food.name.toLowerCase().includes(keyword)) return false;
    if (filters.eatingLevel !== "all" && entry.eatingLevel !== filters.eatingLevel) return false;
    if (filters.quickFilter === "saved" && !entry.isSaved) return false;
    if (filters.quickFilter === "eaten" && !entry.wasEaten) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return filters.sortOrder === "newest" ? -diff : diff;
  });
}

export interface HistoryDateGroup {
  dateKey: string;
  label: string;
  entries: HistoryWithFood[];
}

export function groupByDate(entries: HistoryWithFood[], now: Date = new Date()): HistoryDateGroup[] {
  const todayKey = now.toDateString();
  const yesterdayKey = new Date(now.getTime() - 86400000).toDateString();

  const groups = new Map<string, HistoryDateGroup>();

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const dateKey = date.toDateString();

    let label: string;
    if (dateKey === todayKey) {
      label = `Hôm nay — ${formatVietnameseDate(date)}`;
    } else if (dateKey === yesterdayKey) {
      label = `Hôm qua — ${formatVietnameseDate(date)}`;
    } else {
      label = formatVietnameseDate(date);
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateKey, label, entries: [] });
    }
    groups.get(dateKey)!.entries.push(entry);
  }

  return Array.from(groups.values());
}

function formatVietnameseDate(date: Date): string {
  const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const weekday = weekdays[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${weekday}, ${day}/${month}/${year}`;
}

export interface HistoryStats {
  totalCount: number;
  savedCount: number;
  savedPercentOfMenu: number;
  topEatingLevelLabel: string | null;
  topEatingLevelPercent: number;
  eatenCount: number;
  eatenPercent: number;
}

/** Tất cả số liệu đều tính trực tiếp từ dữ liệu lịch sử hiện có — không có số ước lượng/marketing. */
export function computeStats(entries: HistoryWithFood[], totalFoodsInMenu: number): HistoryStats {
  const totalCount = entries.length;
  const savedCount = new Set(entries.filter((e) => e.isSaved).map((e) => e.foodId)).size;
  const eatenCount = entries.filter((e) => e.wasEaten).length;

  const eatingLevelCounts = new Map<EatingLevel, number>();
  for (const entry of entries) {
    if (!entry.eatingLevel) continue;
    eatingLevelCounts.set(entry.eatingLevel, (eatingLevelCounts.get(entry.eatingLevel) ?? 0) + 1);
  }
  let topEatingLevel: EatingLevel | null = null;
  let topCount = 0;
  for (const [level, count] of eatingLevelCounts) {
    if (count > topCount) {
      topEatingLevel = level;
      topCount = count;
    }
  }
  const topEatingLevelLabel = topEatingLevel ? EATING_LEVEL_LABELS[topEatingLevel] : null;

  return {
    totalCount,
    savedCount,
    savedPercentOfMenu: totalFoodsInMenu > 0 ? Math.round((savedCount / totalFoodsInMenu) * 100) : 0,
    topEatingLevelLabel,
    topEatingLevelPercent: totalCount > 0 ? Math.round((topCount / totalCount) * 100) : 0,
    eatenCount,
    eatenPercent: totalCount > 0 ? Math.round((eatenCount / totalCount) * 100) : 0,
  };
}

export interface EatingLevelBreakdownSlice {
  eatingLevel: EatingLevel;
  label: string;
  count: number;
  percent: number;
  color: string;
}

const EATING_LEVEL_COLORS: Record<EatingLevel, string> = {
  snack: "#F07FA5",
  normal: "#5B9EEB",
  hearty: "#23466F",
  full: "#F4C95D",
};

export function computeEatingLevelBreakdown(entries: HistoryWithFood[]): EatingLevelBreakdownSlice[] {
  const total = entries.length;
  if (total === 0) return [];

  return (Object.keys(EATING_LEVEL_LABELS) as EatingLevel[])
    .map((level) => {
      const count = entries.filter((e) => e.eatingLevel === level).length;
      return {
        eatingLevel: level,
        label: EATING_LEVEL_LABELS[level],
        count,
        percent: Math.round((count / total) * 100),
        color: EATING_LEVEL_COLORS[level],
      };
    })
    .filter((slice) => slice.count > 0);
}

const MEAL_BUCKET_LABELS = ["Khuya/Sáng sớm", "Sáng", "Trưa", "Xế", "Tối"] as const;

/** Suy ra khung giờ hay random nhất từ timestamp thật trong lịch sử — không suy đoán. */
export function computeTopMealTimeInsight(
  entries: HistoryWithFood[],
): { label: string; percent: number } | null {
  if (entries.length === 0) return null;

  const buckets = new Map<string, number>();
  for (const entry of entries) {
    const hour = new Date(entry.timestamp).getHours();
    let label: string;
    if (hour < 5) label = MEAL_BUCKET_LABELS[0];
    else if (hour < 10) label = MEAL_BUCKET_LABELS[1];
    else if (hour < 14) label = MEAL_BUCKET_LABELS[2];
    else if (hour < 18) label = MEAL_BUCKET_LABELS[3];
    else label = MEAL_BUCKET_LABELS[4];
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  let topLabel = "";
  let topCount = 0;
  for (const [label, count] of buckets) {
    if (count > topCount) {
      topLabel = label;
      topCount = count;
    }
  }

  return { label: topLabel, percent: Math.round((topCount / entries.length) * 100) };
}

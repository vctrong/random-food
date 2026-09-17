import type { UserSettings } from "@/types/settings";
import type { HistoryWithFood } from "@/features/history-log/historyLogic";
import type { SavedFood } from "@/features/saved-foods/savedFoodsLogic";

export const SETTINGS_STORAGE_KEY = "homnayangi:settings";

export const DEFAULT_SETTINGS: UserSettings = {
  favoriteFoodNames: ["Cơm tấm", "Phở bò tái nạm", "Trà sữa trân châu"],
  dislikedIngredients: ["Mắm tôm"],
  priceRange: "30-60k",
  spicePreference: "cay-nhe",
  vegetarianMode: false,
  allowRepeatWithin24h: true,
  soundEffectsEnabled: true,
};

export const PRICE_RANGE_OPTIONS: { id: UserSettings["priceRange"]; label: string }[] = [
  { id: "duoi-30k", label: "< 30k (Tiết kiệm)" },
  { id: "30-60k", label: "30k - 60k (Phổ thông)" },
  { id: "60-120k", label: "60k - 120k (Thoải mái)" },
  { id: "tren-120k", label: "> 120k (Sang xịn)" },
  { id: "tat-ca", label: "Tất cả mức giá" },
];

export const SPICE_OPTIONS: { id: UserSettings["spicePreference"]; label: string; hint: string }[] = [
  { id: "khong-cay", label: "Không cay", hint: "0 quả ớt" },
  { id: "cay-nhe", label: "Cay nhẹ", hint: "1 quả ớt" },
  { id: "cay-vua", label: "Cay vừa", hint: "2-3 quả ớt" },
  { id: "sieu-cay", label: "Siêu cay", hint: "Mồ hôi rơi" },
];

/** Kích thước JSON hoá của settings — số liệu THẬT, không phải số cố định. */
export function computeSettingsSize(settings: UserSettings): string {
  const bytes = new Blob([JSON.stringify(settings)]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Đọc nhanh cờ âm thanh (đồng bộ, chỉ dùng phía client) để các màn khác quyết định có phát âm thanh không. */
export function readSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS.soundEffectsEnabled;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return parsed.soundEffectsEnabled ?? DEFAULT_SETTINGS.soundEffectsEnabled;
  } catch {
    return DEFAULT_SETTINGS.soundEffectsEnabled;
  }
}

export function buildHistoryExportJson(entries: HistoryWithFood[]): string {
  const rows = entries.map((entry) => ({
    thoiGian: entry.timestamp,
    monAn: entry.food.name,
    mucDoAn: entry.eatingLevel,
    gia: `${entry.food.priceMin ?? "?"}-${entry.food.priceMax ?? "?"}`,
    quan: entry.food.restaurant?.name ?? "",
    diaChi: entry.food.restaurant?.address ?? "",
    daAn: entry.wasEaten,
    daLuu: entry.isSaved,
  }));
  return JSON.stringify(rows, null, 2);
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildHistoryExportCsv(entries: HistoryWithFood[]): string {
  const header = ["Thời gian", "Món ăn", "Mức độ ăn", "Giá", "Quán", "Địa chỉ", "Đã ăn", "Đã lưu"];
  const rows = entries.map((entry) =>
    [
      entry.timestamp,
      entry.food.name,
      entry.eatingLevel ?? "",
      `${entry.food.priceMin ?? "?"}-${entry.food.priceMax ?? "?"}`,
      entry.food.restaurant?.name ?? "",
      entry.food.restaurant?.address ?? "",
      entry.wasEaten ? "Có" : "Không",
      entry.isSaved ? "Có" : "Không",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function buildSavedBackupJson(saved: SavedFood[]): string {
  const rows = saved.map((item) => ({
    monAn: item.food.name,
    quan: item.food.restaurant?.name ?? "",
    diaChi: item.food.restaurant?.address ?? "",
    luuLuc: item.savedAt,
  }));
  return JSON.stringify(rows, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * MOCK DATA TẠM THỜI — danh sách món "đã lưu" giả lập để dựng UI màn Đã lưu.
 * Chỉ được truy cập qua `src/services/savedFoodService.ts`.
 * Sẽ được thay bằng dữ liệu thật (lưu theo tài khoản) khi có backend.
 */
export const isMockData = true;

export interface SavedFoodRecord {
  foodId: string;
  /** ISO datetime lúc lưu món. */
  savedAt: string;
}

export const MOCK_SAVED_FOODS: SavedFoodRecord[] = [
  { foodId: "com-tam-suon-bi-cha", savedAt: "2026-09-14T09:00:00+07:00" },
  { foodId: "pho-bo-tai-nam", savedAt: "2026-09-13T08:30:00+07:00" },
  { foodId: "bun-bo-hue-dac-biet", savedAt: "2026-09-12T19:00:00+07:00" },
  { foodId: "banh-mi-thit-cha-pate", savedAt: "2026-09-08T07:15:00+07:00" },
  { foodId: "tokbokki-pho-mai", savedAt: "2026-09-11T16:00:00+07:00" },
  { foodId: "ga-ran-sot-cay", savedAt: "2026-09-10T20:00:00+07:00" },
  { foodId: "tra-sua-tran-chau", savedAt: "2026-09-01T15:00:00+07:00" },
  { foodId: "lau-thai-hai-san", savedAt: "2026-08-25T18:30:00+07:00" },
];

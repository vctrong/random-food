import type { HistoryEntry } from "@/types/history";

/**
 * MOCK DATA TẠM THỜI — nhật ký random/ăn uống giả lập để dựng UI.
 * Chỉ được truy cập qua `src/services/historyService.ts`.
 * Sẽ được thay bằng dữ liệu thật (lưu theo tài khoản) khi có backend.
 */
export const isMockData = true;

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "hist-1",
    foodId: "com-tam-suon-bi-cha",
    timestamp: "2026-09-15T12:34:00+07:00",
    hungerLevel: "an-binh-thuong",
    wasEaten: true,
    isSaved: true,
  },
  {
    id: "hist-2",
    foodId: "bun-bo-hue-dac-biet",
    timestamp: "2026-09-15T18:42:00+07:00",
    hungerLevel: "an-vua-vua",
    wasEaten: true,
    isSaved: false,
  },
  {
    id: "hist-3",
    foodId: "banh-mi-thit-cha-pate",
    timestamp: "2026-09-14T11:52:00+07:00",
    hungerLevel: "an-vat",
    wasEaten: true,
    isSaved: true,
  },
  {
    id: "hist-4",
    foodId: "tra-sua-tran-chau",
    timestamp: "2026-09-14T20:15:00+07:00",
    hungerLevel: "an-vat",
    wasEaten: false,
    isSaved: false,
  },
  {
    id: "hist-5",
    foodId: "lau-thai-hai-san",
    timestamp: "2026-09-13T19:30:00+07:00",
    hungerLevel: "an-lon",
    wasEaten: true,
    isSaved: true,
  },
];

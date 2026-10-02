export type LocationSource = "gps" | "pin_confirmed" | "geocoded" | "none";

/** 1 khung giờ "HH:mm"; `close <= open` nghĩa là qua đêm (đóng vào hôm sau). */
export interface OpeningRange {
  open: string;
  close: string;
}

/** `day`: 0 = Thứ 2 … 6 = Chủ nhật. `closed` = nghỉ cả ngày, `allDay` = mở 24 giờ (khi đó `ranges` rỗng). */
export interface OpeningDay {
  day: number;
  closed: boolean;
  allDay: boolean;
  ranges: OpeningRange[];
}

/**
 * Giờ mở cửa có cấu trúc (features/opening-hours/openingHours.ts). `unknown` là trạng thái RÕ RÀNG
 * "Không rõ giờ" — reviewer bổ sung khi xác minh. `mode` chỉ để form mở đúng chế độ nhanh/chi tiết.
 */
export type OpeningSchedule =
  | { status: "unknown" }
  | { status: "known"; mode: "daily" | "weekly"; days: OpeningDay[] };

/** 1 quán trong danh sách chọn quán / gợi ý quán gần ghim. */
export interface RestaurantOption {
  id: string;
  name: string;
  address: string;
  /** Ảnh đầu tiên của quán, null → hiển thị ảnh mặc định (RestaurantImage). */
  image: string | null;
  location: { lat: number; lng: number } | null;
  /** Mét, chỉ có khi truy vấn kèm vị trí. */
  distanceMeters: number | null;
}

export interface RestaurantPage {
  items: RestaurantOption[];
  nextCursor: string | null;
}

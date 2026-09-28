export type LocationSource = "gps" | "pin_confirmed" | "geocoded" | "none";

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

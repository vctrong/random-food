import type { OpeningSchedule } from "@/types/restaurant";
/**
 * Mức độ ăn thật từ schema Mongoose `Food.eatingLevels` (docs/database.md,
 * docs/BR_UC.md mục 2.1) — snack/normal/hearty/full.
 */
export type EatingLevel = "snack" | "normal" | "hearty" | "full";

export interface FoodCategorySummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface FoodRestaurantLocation {
  lat: number;
  lng: number;
}

export interface FoodRestaurantSummary {
  id: string;
  name: string;
  address: string;
  location: FoodRestaurantLocation | null;
  /** Giờ mở cửa có cấu trúc (đã resolve cả dữ liệu chuỗi cũ) — hiển thị qua OpeningHoursSummary. */
  openingSchedule?: OpeningSchedule;
  /** Ảnh quán (có thể rỗng) — hiển thị qua RestaurantImage để có ảnh mặc định. */
  images?: string[];
  /** Quán đã ngừng hoạt động (businessStatus = "closed") — ẩn khỏi random, /mon-an, tìm kiếm; trang chi tiết hiện badge. */
  isClosed?: boolean;
}

/** Món ăn THẬT từ MongoDB (`GET /api/foods`) — đã duyệt & công khai. Đây là type Food DUY NHẤT trong app. */
export interface Food {
  id: string;
  name: string;
  description: string;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  caloriesMin: number | null;
  caloriesMax: number | null;
  eatingLevels: EatingLevel[];
  tags: string[];
  avgRating: number;
  ratingCount: number;
  categories: FoodCategorySummary[];
  restaurant: FoodRestaurantSummary | null;
}

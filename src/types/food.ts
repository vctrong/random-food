export type HungerLevel = "an-vat" | "an-binh-thuong" | "an-vua-vua" | "an-lon";

export type FoodCategory =
  | "com"
  | "bun-pho-hu-tieu"
  | "an-vat"
  | "mon-nuoc"
  | "chay"
  | "banh-mi"
  | "do-uong";

export type SpiceLevel = "khong-cay" | "cay-nhe" | "cay-vua" | "sieu-cay";

export type MealTime = "sang" | "trua" | "xe" | "toi";

export interface Food {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  hungerLevel: HungerLevel;
  priceMin: number;
  priceMax: number;
  calories: number;
  spiceLevel: SpiceLevel;
  mealTimes: MealTime[];
  isVegetarian: boolean;
  restaurantName: string;
  area: string;
  /** Seed cho ảnh placeholder picsum.photos, tránh trùng ảnh giữa các món */
  imageSeed: string;
}

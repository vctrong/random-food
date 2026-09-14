export type PriceRangePreference = "duoi-30k" | "30-60k" | "60-120k" | "tren-120k" | "tat-ca";
export type SpicePreference = "khong-cay" | "cay-nhe" | "cay-vua" | "sieu-cay";

export interface UserSettings {
  favoriteFoodNames: string[];
  dislikedIngredients: string[];
  priceRange: PriceRangePreference;
  spicePreference: SpicePreference;
  vegetarianMode: boolean;
  allowRepeatWithin24h: boolean;
  soundEffectsEnabled: boolean;
}

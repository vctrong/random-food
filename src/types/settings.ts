export type PriceRangePreference = "duoi-30k" | "30-60k" | "60-120k" | "tren-120k" | "tat-ca";
export type SpicePreference = "khong-cay" | "cay-nhe" | "cay-vua" | "sieu-cay";

/**
 * Cài đặt GIAO DIỆN thuần client — Guest cũng dùng được, không cần DB (khác với
 * sở thích ăn uống đã chuyển hẳn sang UserProfile DB, xem ProfileForm.tsx).
 * Theme không nằm ở đây — next-themes tự quản lý riêng (xem ThemeProvider.tsx).
 */
export interface UserSettings {
  soundEffectsEnabled: boolean;
  /** Ép giảm chuyển động trong app dù OS không báo prefers-reduced-motion (vd không chỉnh được ở OS công cộng/máy công ty). */
  reducedMotionOverride: boolean;
}

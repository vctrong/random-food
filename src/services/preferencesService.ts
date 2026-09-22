import type { PersonalPreferences } from "@/features/random-food/randomLogic";

/**
 * Lớp duy nhất "biết" cách lấy sở thích cá nhân thật (UserProfile DB) cho thuật
 * toán random — chỉ dùng phía client, chỉ gọi khi đã đăng nhập (Guest không có
 * profile lưu trữ, BR-U01/U02).
 */
export async function getPersonalPreferences(): Promise<PersonalPreferences | null> {
  try {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      dislikedIngredients: data.preferences?.dislikedIngredients ?? [],
      vegetarianMode: data.preferences?.vegetarianMode ?? false,
      spicePreference: data.preferences?.spicePreference ?? null,
      priceRange: data.preferences?.priceRange ?? null,
      allowRepeatWithin24h: data.preferences?.allowRepeatWithin24h ?? true,
    };
  } catch {
    return null;
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** foodId các lần "chốt ăn" (Experience) trong 24h gần nhất — dùng để loại trừ khi allowRepeatWithin24h = false. */
export async function getRecentFoodIds(): Promise<string[]> {
  try {
    const response = await fetch("/api/experiences", { cache: "no-store" });
    if (!response.ok) return [];
    const experiences = (await response.json()) as { foodId: string | null; createdAt: string }[];
    const cutoff = Date.now() - ONE_DAY_MS;
    return experiences
      .filter((entry) => entry.foodId && new Date(entry.createdAt).getTime() >= cutoff)
      .map((entry) => entry.foodId as string);
  } catch {
    return [];
  }
}

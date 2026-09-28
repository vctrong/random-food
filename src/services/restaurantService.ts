import type { RestaurantOption, RestaurantPage } from "@/types/restaurant";

/** Lớp duy nhất "biết" danh sách quán đến từ đâu — gọi /api/restaurants. */

export async function fetchRestaurantPage(
  { q, cursor, near }: { q: string; cursor: string | null; near: { lat: number; lng: number } | null },
  signal?: AbortSignal,
): Promise<RestaurantPage> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (cursor) params.set("cursor", cursor);
  if (near) {
    params.set("lat", near.lat.toFixed(6));
    params.set("lng", near.lng.toFixed(6));
  }
  const response = await fetch(`/api/restaurants?${params.toString()}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("RESTAURANTS_FAILED");
  return (await response.json()) as RestaurantPage;
}

export async function fetchNearbyRestaurants(
  point: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RestaurantOption[]> {
  const response = await fetch(`/api/restaurants/nearby?lat=${point.lat.toFixed(6)}&lng=${point.lng.toFixed(6)}`, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { items?: RestaurantOption[] };
  return data.items ?? [];
}

/**
 * Geocode qua proxy /api/geocode (server lo User-Agent, 1 request/giây, cache).
 * Phía client thêm cache + chỉ giữ request mới nhất để không dồn request khi
 * user kéo bản đồ liên tục.
 */

export interface GeocodeHit {
  label: string;
  lat: number;
  lng: number;
}

const searchCache = new Map<string, GeocodeHit | null>();
const reverseCache = new Map<string, string | null>();

export type GeocodeOutcome<T> = { ok: true; data: T } | { ok: false };

export async function geocodeAddress(address: string, signal?: AbortSignal): Promise<GeocodeOutcome<GeocodeHit | null>> {
  const key = address.trim().toLowerCase();
  if (searchCache.has(key)) return { ok: true, data: searchCache.get(key) ?? null };
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(address.trim())}`, { signal });
    if (!response.ok) return { ok: false };
    const data = (await response.json()) as { results?: GeocodeHit[] };
    const hit = data.results?.[0] ?? null;
    searchCache.set(key, hit);
    return { ok: true, data: hit };
  } catch {
    return { ok: false };
  }
}

export async function reverseGeocode(
  point: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeocodeOutcome<string | null>> {
  const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  if (reverseCache.has(key)) return { ok: true, data: reverseCache.get(key) ?? null };
  try {
    const response = await fetch(`/api/geocode/reverse?lat=${point.lat.toFixed(6)}&lng=${point.lng.toFixed(6)}`, { signal });
    if (!response.ok) return { ok: false };
    const data = (await response.json()) as { address?: string | null };
    reverseCache.set(key, data.address ?? null);
    return { ok: true, data: data.address ?? null };
  } catch {
    return { ok: false };
  }
}

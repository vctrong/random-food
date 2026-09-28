import { hitRateLimit } from "@/lib/rateLimit";

/**
 * Client Nominatim (OSM) phía server — MỌI request tới Nominatim phải đi qua đây
 * (trình duyệt không set được User-Agent). Tuân thủ usage policy:
 * - User-Agent định danh app + liên hệ (NOMINATIM_CONTACT_EMAIL, fallback NEXTAUTH_URL).
 * - Tối đa 1 request/giây TOÀN HỆ THỐNG: khoá dùng chung qua collection rateLimits
 *   (đúng cả khi nhiều instance), request tới sau thì chờ lượt, quá lâu thì bỏ.
 * - Cache kết quả trong bộ nhớ instance (địa chỉ ít đổi, giảm hẳn số request).
 */

const REQUEST_TIMEOUT_MS = 6000;
const MAX_QUEUE_WAIT_MS = 4000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
/** Ưu tiên khu vực Cần Thơ (viewbox lỏng), không loại trừ kết quả ngoài vùng. */
const CAN_THO_VIEWBOX = "105.5,10.25,105.95,9.85";

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export type NominatimOutcome<T> = { ok: true; data: T } | { ok: false; reason: "busy" | "timeout" | "upstream" };

const cache = new Map<string, { value: unknown; expiresAt: number }>();

function readCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  // Map giữ thứ tự chèn — chèn lại để entry vừa dùng thành "mới nhất" (LRU đơn giản).
  cache.delete(key);
  cache.set(key, entry);
  return entry.value as T;
}

function writeCache(key: string, value: unknown) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function userAgent(): string {
  const contact = process.env.NOMINATIM_CONTACT_EMAIL?.trim() || process.env.NEXTAUTH_URL?.trim() || "nayangi";
  return `NayAnGi/1.0 (+${contact})`;
}

async function waitForSlot(): Promise<boolean> {
  const deadline = Date.now() + MAX_QUEUE_WAIT_MS;
  while (Date.now() < deadline) {
    const result = await hitRateLimit("nominatim:global", 1, 1000);
    if (result.allowed) return true;
    await new Promise((resolve) => setTimeout(resolve, Math.min(result.retryAfterMs, 1000)));
  }
  return false;
}

async function callNominatim<T>(path: "search" | "reverse", params: Record<string, string>): Promise<NominatimOutcome<T>> {
  if (!(await waitForSlot())) return { ok: false, reason: "busy" };

  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "jsonv2");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent(),
        Referer: process.env.NEXTAUTH_URL ?? "",
        "Accept-Language": "vi",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, reason: "upstream" };
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const isTimeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, reason: isTimeout ? "timeout" : "upstream" };
  }
}

interface NominatimSearchItem {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Nominatim thường không khớp số nhà/hẻm ở VN, nên thử địa chỉ đầy đủ trước rồi
 * bỏ dần phần đầu (số nhà, hẻm...) để ít nhất định vị được đường/phường.
 */
function buildQueryCandidates(query: string): string[] {
  const withCity = /c[aầ]n th[oơ]/i.test(query) ? query : `${query}, Cần Thơ`;
  const parts = withCity.split(",").map((part) => part.trim()).filter(Boolean);
  const candidates: string[] = [];
  for (let start = 0; start < parts.length - 1 && candidates.length < 3; start++) {
    candidates.push(parts.slice(start).join(", "));
  }
  return candidates;
}

export async function geocodeAddress(query: string): Promise<NominatimOutcome<GeocodeResult[]>> {
  const cacheKey = `search:${query.trim().toLowerCase()}`;
  const cached = readCache<GeocodeResult[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  // Thử tuần tự (không song song) để không vượt 1 request/giây.
  for (const candidate of buildQueryCandidates(query)) {
    const outcome = await callNominatim<NominatimSearchItem[]>("search", {
      q: candidate,
      limit: "5",
      countrycodes: "vn",
      viewbox: CAN_THO_VIEWBOX,
      bounded: "0",
    });
    if (!outcome.ok) return outcome;
    if (outcome.data.length > 0) {
      const results = outcome.data.map((item) => ({ label: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }));
      writeCache(cacheKey, results);
      return { ok: true, data: results };
    }
  }
  writeCache(cacheKey, []);
  return { ok: true, data: [] };
}

interface NominatimReverseItem {
  display_name?: string;
  address?: Record<string, string>;
  error?: string;
}

/** Địa chỉ gọn kiểu VN: "số nhà đường, phường, quận, thành phố" — bỏ mã bưu chính/quốc gia. */
function formatVietnameseAddress(item: NominatimReverseItem): string | null {
  const address = item.address;
  if (!address) return item.display_name ?? null;
  const street = [address.house_number, address.road ?? address.pedestrian ?? address.footway].filter(Boolean).join(" ");
  const parts = [
    street || address.amenity || address.shop,
    address.quarter ?? address.suburb ?? address.village,
    address.city_district ?? address.county ?? address.town,
    address.city ?? address.state,
  ].filter((part): part is string => Boolean(part));
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.length > 0 ? unique.join(", ") : (item.display_name ?? null);
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimOutcome<string | null>> {
  // ~11m — kéo map lệch vài mét vẫn dùng lại được kết quả cũ.
  const cacheKey = `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = readCache<string | null>(cacheKey);
  if (cached !== undefined) return { ok: true, data: cached };

  const outcome = await callNominatim<NominatimReverseItem>("reverse", {
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
  });
  if (!outcome.ok) return outcome;
  const label = outcome.data.error ? null : formatVietnameseAddress(outcome.data);
  writeCache(cacheKey, label);
  return { ok: true, data: label };
}

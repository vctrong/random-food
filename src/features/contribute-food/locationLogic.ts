import { similarity } from "@/lib/vietnameseText";
import type { LocationSource, RestaurantOption } from "@/types/restaurant";

/**
 * Luật chuyển `locationSource` của quán mới (docs/contribute-food.md):
 * - Kéo bản đồ / xác nhận ghim → "pin_confirmed"; nút "Tôi đang ở quán này" → "gps".
 * - Geocode địa chỉ chỉ được dời ghim khi user CHƯA tự ghim (none/geocoded):
 *   thành công → "geocoded", thất bại → về "none" (ghim cũ thuộc địa chỉ cũ, không còn đúng).
 */

export interface PinState {
  location: { lat: number; lng: number } | null;
  source: LocationSource;
}

export function canGeocodeMovePin(source: LocationSource): boolean {
  return source === "none" || source === "geocoded";
}

export function applyGeocodeResult(state: PinState, hit: { lat: number; lng: number } | null): PinState {
  if (!canGeocodeMovePin(state.source)) return state;
  return hit ? { location: hit, source: "geocoded" } : { location: null, source: "none" };
}

export function applyUserPin(location: { lat: number; lng: number }, fromGps = false): PinState {
  return { location, source: fromGps ? "gps" : "pin_confirmed" };
}

/** Ngưỡng "quán rất gần" — chỉ gợi ý, không chặn tạo quán mới. */
export const VERY_CLOSE_METERS = 50;
const SAME_NAME_THRESHOLD = 0.6;

/**
 * Quán có sẵn nên gợi ý "Quán này có sẵn rồi phải không?": trong ≤ 50m, ưu tiên
 * quán tên giống tên user đang nhập, sau đó tới quán gần nhất. Bỏ quán user đã bấm "Không phải".
 */
export function pickDuplicateCandidate(
  nearby: RestaurantOption[],
  typedName: string,
  dismissedIds: ReadonlySet<string>,
): RestaurantOption | null {
  const candidates = nearby
    .filter((item) => item.distanceMeters !== null && item.distanceMeters <= VERY_CLOSE_METERS && !dismissedIds.has(item.id))
    .map((item) => ({ item, nameScore: typedName.trim() ? similarity(typedName, item.name) : 0 }))
    .sort((a, b) => {
      const aSame = a.nameScore >= SAME_NAME_THRESHOLD ? 1 : 0;
      const bSame = b.nameScore >= SAME_NAME_THRESHOLD ? 1 : 0;
      return bSame - aSame || (a.item.distanceMeters ?? 0) - (b.item.distanceMeters ?? 0);
    });
  return candidates[0]?.item ?? null;
}

import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/lib/models/Restaurant";
import { fuzzyScore, normalizeVietnamese, tokenize, escapeRegExp } from "@/lib/vietnameseText";
import type { RestaurantOption, RestaurantPage } from "@/types/restaurant";

/**
 * Danh sách chọn quán khi đóng góp món (chỉ quán approved + visible):
 * - Không có từ khoá + có vị trí: gần nhất trước ($geoNear), hết quán có toạ độ
 *   thì tiếp tục với quán chưa có toạ độ.
 * - Không có từ khoá, không vị trí: mới thêm gần đây (cursor theo _id).
 * - Có từ khoá: Atlas Search (fuzzy + autocomplete + bỏ dấu, index
 *   `restaurants_search` — docs/contribute-food.md); index chưa có/lỗi thì
 *   fallback regex trên `nameNormalized`/`addressNormalized` + chấm điểm fuzzyScore.
 */

export const ATLAS_SEARCH_INDEX = "restaurants_search";
export const FIRST_PAGE_SIZE = 5;
export const NEXT_PAGE_SIZE = 10;
const FALLBACK_CANDIDATE_LIMIT = 300;
const NEARBY_RADIUS_METERS = 300;

const PUBLIC_FILTER = { moderationStatus: "approved", visibility: "visible" } as const;

type Cursor =
  | { m: "near"; o: number }
  | { m: "noloc"; id: string | null }
  | { m: "recent"; id: string }
  | { m: "search"; o: number };

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Cursor;
    if (value.m === "near" || value.m === "search") return Number.isInteger(value.o) && value.o >= 0 ? value : null;
    if (value.m === "recent") return isValidObjectId(value.id) ? value : null;
    if (value.m === "noloc") return value.id === null || isValidObjectId(value.id) ? value : null;
    return null;
  } catch {
    return null;
  }
}

interface LeanRestaurant {
  _id: unknown;
  name: string;
  address: string;
  images?: string[];
  location?: { coordinates?: [number, number] };
  distance?: number;
}

const PROJECTION = { name: 1, address: 1, images: 1, location: 1 } as const;

function toOption(restaurant: LeanRestaurant): RestaurantOption {
  const coordinates = restaurant.location?.coordinates;
  return {
    id: String(restaurant._id),
    name: restaurant.name,
    address: restaurant.address,
    image: restaurant.images?.[0] ?? null,
    location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
    distanceMeters: typeof restaurant.distance === "number" ? Math.round(restaurant.distance) : null,
  };
}

interface ListInput {
  q?: string;
  cursor?: string | null;
  near?: { lat: number; lng: number } | null;
}

export async function listRestaurants({ q = "", cursor: rawCursor = null, near = null }: ListInput): Promise<RestaurantPage> {
  await connectDB();
  const cursor = decodeCursor(rawCursor);
  const limit = cursor ? NEXT_PAGE_SIZE : FIRST_PAGE_SIZE;
  const query = q.trim();

  if (query) return searchRestaurants(query, cursor?.m === "search" ? cursor.o : 0, limit, near);
  if (near && (!cursor || cursor.m === "near")) return listNearest(near, cursor?.m === "near" ? cursor.o : 0, limit);
  if (cursor?.m === "noloc") return listWithoutLocation(cursor.id, limit);
  return listRecent(cursor?.m === "recent" ? cursor.id : null, limit);
}

async function listNearest(near: { lat: number; lng: number }, offset: number, limit: number): Promise<RestaurantPage> {
  const docs = (await Restaurant.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [near.lng, near.lat] },
        distanceField: "distance",
        spherical: true,
        query: PUBLIC_FILTER,
      },
    },
    { $skip: offset },
    { $limit: limit + 1 },
    { $project: { ...PROJECTION, distance: 1 } },
  ])) as LeanRestaurant[];

  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map(toOption);
  // Hết quán có toạ độ → chuyển sang quán chưa có toạ độ để không "mất" quán nào.
  const nextCursor = hasMore ? encodeCursor({ m: "near", o: offset + limit }) : encodeCursor({ m: "noloc", id: null });
  if (!hasMore && items.length < limit) {
    const rest = await listWithoutLocation(null, limit - items.length);
    return { items: [...items, ...rest.items], nextCursor: rest.nextCursor };
  }
  return { items, nextCursor };
}

async function listWithoutLocation(afterId: string | null, limit: number): Promise<RestaurantPage> {
  const filter: Record<string, unknown> = { ...PUBLIC_FILTER, location: { $exists: false } };
  if (afterId) filter._id = { $lt: new Types.ObjectId(afterId) };
  const docs = (await Restaurant.find(filter, PROJECTION).sort({ _id: -1 }).limit(limit + 1).lean()) as unknown as LeanRestaurant[];
  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit);
  return {
    items: items.map(toOption),
    nextCursor: hasMore ? encodeCursor({ m: "noloc", id: String(items[items.length - 1]._id) }) : null,
  };
}

async function listRecent(beforeId: string | null, limit: number): Promise<RestaurantPage> {
  const filter: Record<string, unknown> = { ...PUBLIC_FILTER };
  if (beforeId) filter._id = { $lt: new Types.ObjectId(beforeId) };
  const docs = (await Restaurant.find(filter, PROJECTION).sort({ _id: -1 }).limit(limit + 1).lean()) as unknown as LeanRestaurant[];
  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit);
  return {
    items: items.map(toOption),
    nextCursor: hasMore ? encodeCursor({ m: "recent", id: String(items[items.length - 1]._id) }) : null,
  };
}

/** Atlas Search lỗi (không phải cluster Atlas / sai cấu hình) → nhớ 5 phút, dùng fallback. */
let atlasSearchDisabledUntil = 0;

async function searchRestaurants(
  query: string,
  offset: number,
  limit: number,
  near: { lat: number; lng: number } | null,
): Promise<RestaurantPage> {
  if (Date.now() >= atlasSearchDisabledUntil) {
    try {
      const docs = (await Restaurant.aggregate([
        {
          $search: {
            index: ATLAS_SEARCH_INDEX,
            compound: {
              should: [
                { autocomplete: { query, path: "name", fuzzy: { maxEdits: 1, prefixLength: 1 }, score: { boost: { value: 3 } } } },
                { text: { query, path: "name", fuzzy: { maxEdits: 2, prefixLength: 1 }, score: { boost: { value: 2 } } } },
                { autocomplete: { query, path: "address", fuzzy: { maxEdits: 1, prefixLength: 1 } } },
                { text: { query, path: "address", fuzzy: { maxEdits: 2, prefixLength: 1 } } },
              ],
              minimumShouldMatch: 1,
              filter: [
                { equals: { path: "moderationStatus", value: "approved" } },
                { equals: { path: "visibility", value: "visible" } },
              ],
            },
          },
        },
        { $skip: offset },
        { $limit: limit + 1 },
        { $project: PROJECTION },
      ])) as LeanRestaurant[];

      // Atlas trả MẢNG RỖNG (không lỗi) khi index chưa tạo — trang đầu rỗng thì thử fallback cho chắc.
      if (docs.length > 0 || offset > 0) {
        const hasMore = docs.length > limit;
        return {
          items: withDistance(docs.slice(0, limit).map(toOption), near),
          nextCursor: hasMore ? encodeCursor({ m: "search", o: offset + limit }) : null,
        };
      }
    } catch (error) {
      console.warn("[restaurantSearch] Atlas Search không khả dụng, dùng fallback regex.", error);
      atlasSearchDisabledUntil = Date.now() + 5 * 60 * 1000;
    }
  }
  return fallbackSearch(query, offset, limit, near);
}

async function fallbackSearch(
  query: string,
  offset: number,
  limit: number,
  near: { lat: number; lng: number } | null,
): Promise<RestaurantPage> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return { items: [], nextCursor: null };

  // Lọc thô bằng 2 ký tự đầu của mỗi từ (đầu từ) để vẫn bắt được từ gõ sai ở phần sau; chấm điểm kỹ bằng fuzzyScore.
  const prefixes = [...new Set(tokens.map((token) => token.slice(0, 2)))].map(escapeRegExp);
  const pattern = `(^| )(${prefixes.join("|")})`;
  const candidates = (await Restaurant.find(
    { ...PUBLIC_FILTER, $or: [{ nameNormalized: { $regex: pattern } }, { addressNormalized: { $regex: pattern } }] },
    { ...PROJECTION, nameNormalized: 1, addressNormalized: 1 },
  )
    .limit(FALLBACK_CANDIDATE_LIMIT)
    .lean()) as unknown as (LeanRestaurant & { nameNormalized?: string; addressNormalized?: string })[];

  const normalizedQuery = normalizeVietnamese(query);
  const ranked = candidates
    .map((restaurant) => ({
      restaurant,
      score: Math.max(
        fuzzyScore(normalizedQuery, restaurant.nameNormalized ?? restaurant.name),
        0.8 * fuzzyScore(normalizedQuery, restaurant.addressNormalized ?? restaurant.address),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const page = ranked.slice(offset, offset + limit).map((entry) => toOption(entry.restaurant));
  return {
    items: withDistance(page, near),
    nextCursor: ranked.length > offset + limit ? encodeCursor({ m: "search", o: offset + limit }) : null,
  };
}

/** Khoảng cách theo công thức haversine — cho kết quả tìm kiếm (không đi qua $geoNear). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}

function withDistance(items: RestaurantOption[], near: { lat: number; lng: number } | null): RestaurantOption[] {
  if (!near) return items;
  return items.map((item) => ({ ...item, distanceMeters: item.location ? distanceMeters(near, item.location) : null }));
}

/** Quán đã duyệt trong bán kính 300m quanh ghim — marker trên bản đồ + gợi ý "quán có sẵn rồi". */
export async function findNearbyRestaurants(point: { lat: number; lng: number }): Promise<RestaurantOption[]> {
  await connectDB();
  const docs = (await Restaurant.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [point.lng, point.lat] },
        distanceField: "distance",
        maxDistance: NEARBY_RADIUS_METERS,
        spherical: true,
        query: PUBLIC_FILTER,
      },
    },
    { $limit: 30 },
    { $project: { ...PROJECTION, distance: 1 } },
  ])) as LeanRestaurant[];
  return docs.map(toOption);
}

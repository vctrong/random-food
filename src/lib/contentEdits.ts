import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { AuditLog } from "@/lib/models/AuditLog";
import { notify } from "@/lib/notifications/notify";
import {
  formatOpeningSchedule,
  openingScheduleSchema,
  resolveOpeningSchedule,
  toStoredOpeningHours,
} from "@/features/opening-hours/openingHours";
import type { OpeningSchedule } from "@/types/restaurant";

/**
 * Sửa trực tiếp nội dung món/quán (BR-F08 ngoại lệ, BR-M13):
 * - FoodReviewer khi duyệt đóng góp: CHỈ dữ kiện thực tế — giá món; địa chỉ, toạ độ, giờ mở cửa của quán.
 * - Admin khi xử lý báo cáo: toàn quyền, kể cả đổi tên/mô tả và gỡ ảnh sai.
 * Mỗi lần sửa ghi AuditLog `content_edit` kèm giá trị trước/sau và báo cho người đóng góp.
 */

export type EditScope = "reviewer" | "admin";

export interface FoodEdit {
  priceMin?: number;
  priceMax?: number;
  name?: string;
  description?: string;
  /** URL ảnh cần gỡ (phải nằm trong ảnh hiện có). */
  removeImages?: string[];
}

export interface RestaurantEdit {
  address?: string;
  /** null = bỏ toạ độ. */
  location?: { lat: number; lng: number } | null;
  /** Giờ mở cửa có cấu trúc (thay ô chữ tự do cũ). */
  openingSchedule?: OpeningSchedule;
  name?: string;
  removeImages?: string[];
}

const REVIEWER_FOOD_FIELDS = new Set<keyof FoodEdit>(["priceMin", "priceMax"]);
const REVIEWER_RESTAURANT_FIELDS = new Set<keyof RestaurantEdit>(["address", "location", "openingSchedule"]);

export type ContentEditError = "NOT_FOUND" | "FORBIDDEN_FIELD" | "INVALID_VALUE" | "NOTHING_CHANGED";

type Change = { field: string; before: unknown; after: unknown };

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function recordEdit({
  actorId,
  targetType,
  targetId,
  name,
  ownerId,
  changes,
  reason,
  context,
}: {
  actorId: string;
  targetType: "food" | "restaurant";
  targetId: string;
  name: string;
  ownerId: string | null;
  changes: Change[];
  reason?: string;
  context: "contribution_review" | "report_case";
}) {
  await AuditLog.create({
    actorId,
    action: "content_edit",
    targetType,
    targetId,
    reason: reason?.trim() || undefined,
    metadata: { name, context, changes },
  });
  if (ownerId && ownerId !== actorId) {
    await notify(ownerId, {
      type: "content_corrected",
      payload: { targetType, targetId, name, fields: [...new Set(changes.map((change) => change.field))] },
      actorId,
    });
  }
}

export async function editFood({
  actorId,
  scope,
  foodId,
  edit,
  reason,
  context,
}: {
  actorId: string;
  scope: EditScope;
  foodId: string;
  edit: FoodEdit;
  reason?: string;
  context: "contribution_review" | "report_case";
}): Promise<{ error: ContentEditError | null }> {
  if (!isValidObjectId(foodId)) return { error: "NOT_FOUND" };
  const keys = (Object.keys(edit) as (keyof FoodEdit)[]).filter((key) => edit[key] !== undefined);
  if (scope === "reviewer" && keys.some((key) => !REVIEWER_FOOD_FIELDS.has(key))) return { error: "FORBIDDEN_FIELD" };

  await connectDB();
  const food = await Food.findById(foodId);
  if (!food) return { error: "NOT_FOUND" };

  const changes: Change[] = [];
  if (edit.priceMin !== undefined || edit.priceMax !== undefined) {
    const min = edit.priceMin ?? food.priceRange?.min;
    const max = edit.priceMax ?? food.priceRange?.max;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) return { error: "INVALID_VALUE" };
    const before = { min: food.priceRange?.min ?? null, max: food.priceRange?.max ?? null };
    if (!sameJson(before, { min, max })) {
      changes.push({ field: "price", before, after: { min, max } });
      food.priceRange = { min, max };
    }
  }
  if (edit.name !== undefined) {
    const name = edit.name.trim();
    if (!name || name.length > 120) return { error: "INVALID_VALUE" };
    if (name !== food.name) changes.push({ field: "name", before: food.name, after: name });
    food.name = name;
  }
  if (edit.description !== undefined) {
    const description = edit.description.trim().slice(0, 2000);
    if (description !== (food.description ?? "")) changes.push({ field: "description", before: food.description ?? "", after: description });
    food.description = description;
  }
  if (edit.removeImages?.length) {
    const current: string[] = food.images ?? [];
    const next = current.filter((url) => !edit.removeImages?.includes(url));
    if (next.length !== current.length) {
      changes.push({ field: "images", before: current, after: next });
      food.images = next;
    }
  }
  if (changes.length === 0) return { error: "NOTHING_CHANGED" };

  food.updatedAt = new Date();
  await food.save();
  await recordEdit({
    actorId,
    targetType: "food",
    targetId: foodId,
    name: food.name,
    ownerId: food.createdBy ? String(food.createdBy) : null,
    changes,
    reason,
    context,
  });
  return { error: null };
}

export async function editRestaurant({
  actorId,
  scope,
  restaurantId,
  edit,
  reason,
  context,
}: {
  actorId: string;
  scope: EditScope;
  restaurantId: string;
  edit: RestaurantEdit;
  reason?: string;
  context: "contribution_review" | "report_case";
}): Promise<{ error: ContentEditError | null }> {
  if (!isValidObjectId(restaurantId)) return { error: "NOT_FOUND" };
  const keys = (Object.keys(edit) as (keyof RestaurantEdit)[]).filter((key) => edit[key] !== undefined);
  if (scope === "reviewer" && keys.some((key) => !REVIEWER_RESTAURANT_FIELDS.has(key))) return { error: "FORBIDDEN_FIELD" };

  await connectDB();
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return { error: "NOT_FOUND" };

  const changes: Change[] = [];
  if (edit.address !== undefined) {
    const address = edit.address.trim();
    if (!address || address.length > 300) return { error: "INVALID_VALUE" };
    if (address !== restaurant.address) changes.push({ field: "address", before: restaurant.address, after: address });
    restaurant.address = address;
  }
  if (edit.location !== undefined) {
    const coordinates = restaurant.location?.coordinates;
    const before = coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null;
    const after = edit.location;
    if (after && (!Number.isFinite(after.lat) || !Number.isFinite(after.lng) || Math.abs(after.lat) > 90 || Math.abs(after.lng) > 180)) {
      return { error: "INVALID_VALUE" };
    }
    if (!sameJson(before, after)) {
      changes.push({ field: "location", before, after });
      restaurant.location = after ? { type: "Point", coordinates: [after.lng, after.lat] } : undefined;
      // Người duyệt/Admin tự đặt ghim = đã xác nhận vị trí.
      restaurant.locationSource = after ? "pin_confirmed" : "none";
    }
  }
  if (edit.openingSchedule !== undefined) {
    const parsed = openingScheduleSchema.safeParse(edit.openingSchedule);
    if (!parsed.success) return { error: "INVALID_VALUE" };
    const before = resolveOpeningSchedule(restaurant.openingSchedule as OpeningSchedule | undefined, restaurant.openingHours);
    if (!sameJson(before, parsed.data)) {
      // Giữ tên field "openingHours" để nhãn thông báo content_corrected ("giờ mở cửa") không đổi.
      changes.push({ field: "openingHours", before: formatOpeningSchedule(before), after: formatOpeningSchedule(parsed.data) });
      const stored = toStoredOpeningHours(parsed.data);
      restaurant.openingSchedule = stored.openingSchedule;
      restaurant.openingHours = stored.openingHours;
    }
  }
  if (edit.name !== undefined) {
    const name = edit.name.trim();
    if (!name || name.length > 120) return { error: "INVALID_VALUE" };
    if (name !== restaurant.name) changes.push({ field: "name", before: restaurant.name, after: name });
    restaurant.name = name;
  }
  if (edit.removeImages?.length) {
    const current: string[] = restaurant.images ?? [];
    const next = current.filter((url) => !edit.removeImages?.includes(url));
    if (next.length !== current.length) {
      changes.push({ field: "images", before: current, after: next });
      restaurant.images = next;
    }
  }
  if (changes.length === 0) return { error: "NOTHING_CHANGED" };

  restaurant.updatedAt = new Date();
  await restaurant.save();
  await recordEdit({
    actorId,
    targetType: "restaurant",
    targetId: restaurantId,
    name: restaurant.name,
    ownerId: restaurant.createdBy ? String(restaurant.createdBy) : null,
    changes,
    reason,
    context,
  });
  return { error: null };
}

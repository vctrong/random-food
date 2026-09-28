/**
 * Mục bắt buộc của form đóng góp món (BR-C04 cập nhật: mô tả KHÔNG bắt buộc).
 * "Quán" tính 1 mục dù chọn quán có sẵn hay tạo quán mới (tên + địa chỉ).
 */

export interface ContributeFormSnapshot {
  foodImagesUploaded: number;
  name: string;
  priceMin: number | null;
  priceMax: number | null;
  eatingLevelCount: number;
  categoryCount: number;
  hasProposal: boolean;
  restaurantMode: "existing" | "new";
  hasSelectedRestaurant: boolean;
  newRestaurantName: string;
  newRestaurantAddress: string;
}

export type RequiredField = "images" | "name" | "price" | "eatingLevels" | "categories" | "restaurant";

export function isPriceValid(min: number | null, max: number | null): boolean {
  return min !== null && max !== null && min >= 0 && max >= min;
}

export function getFieldValidity(form: ContributeFormSnapshot): Record<RequiredField, boolean> {
  return {
    images: form.foodImagesUploaded > 0,
    name: form.name.trim().length > 0,
    price: isPriceValid(form.priceMin, form.priceMax),
    eatingLevels: form.eatingLevelCount > 0,
    categories: form.categoryCount + (form.hasProposal ? 1 : 0) > 0,
    restaurant:
      form.restaurantMode === "existing"
        ? form.hasSelectedRestaurant
        : form.newRestaurantName.trim().length > 0 && form.newRestaurantAddress.trim().length > 0,
  };
}

export function countMissingFields(form: ContributeFormSnapshot): number {
  return Object.values(getFieldValidity(form)).filter((valid) => !valid).length;
}

/** "25.000" / "25000đ" → 25000; rỗng hoặc không phải số → null. */
export function parsePrice(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : null;
}

export function formatPriceInput(value: string): string {
  const number = parsePrice(value);
  return number === null ? "" : new Intl.NumberFormat("vi-VN").format(number);
}

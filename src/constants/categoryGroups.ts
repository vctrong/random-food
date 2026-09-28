/**
 * Nhóm cha của danh mục (field `categories.group`) — 8 nhóm đã chốt. Chỉ dùng
 * để gom danh mục trong bảng "Xem tất cả", không phải danh mục chọn được.
 */
export const CATEGORY_GROUPS = [
  { id: "mon-nuoc", label: "Món nước" },
  { id: "com", label: "Cơm" },
  { id: "banh", label: "Bánh" },
  { id: "an-vat", label: "Ăn vặt" },
  { id: "do-uong", label: "Đồ uống" },
  { id: "trang-mieng", label: "Tráng miệng" },
  { id: "chay", label: "Chay" },
  { id: "khac", label: "Khác" },
] as const;

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number]["id"];

export const CATEGORY_GROUP_IDS = CATEGORY_GROUPS.map((group) => group.id) as CategoryGroup[];

export const CATEGORY_GROUP_LABELS = Object.fromEntries(
  CATEGORY_GROUPS.map((group) => [group.id, group.label]),
) as Record<CategoryGroup, string>;

export function isCategoryGroup(value: string): value is CategoryGroup {
  return (CATEGORY_GROUP_IDS as string[]).includes(value);
}

/** Danh mục hệ thống chứa món tạm thời khi đề xuất danh mục chưa được xử lý — user không tự chọn được. */
export const FALLBACK_CATEGORY_SLUG = "khac";

/** Danh mục "Chay" — dùng cho gợi ý chọn kết hợp ("Cơm" + "Chay"). */
export const VEGETARIAN_CATEGORY_SLUG = "chay";

/** Mỗi món tối đa 3 danh mục (tính cả danh mục đề xuất), tối đa 1 danh mục đề xuất. */
export const MAX_CATEGORIES_PER_FOOD = 3;
export const MAX_PROPOSALS_PER_FOOD = 1;

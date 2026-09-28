import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { FALLBACK_CATEGORY_SLUG, isCategoryGroup, type CategoryGroup } from "@/constants/categoryGroups";
import type { CategoryOption } from "@/types/category";

/**
 * Danh mục chọn được (đang hoạt động, KHÔNG gồm danh mục hệ thống "Khác") —
 * dùng cho form đóng góp và combobox "Gộp vào…" ở màn duyệt.
 */
export async function getSelectableCategories(): Promise<CategoryOption[]> {
  await connectDB();
  const categories = (await Category.find({ isActive: true, slug: { $ne: FALLBACK_CATEGORY_SLUG } })
    .sort({ foodCount: -1, name: 1 })
    .lean()) as unknown as { _id: unknown; name: string; slug: string; group?: string; foodCount?: number; icon?: string }[];

  return categories.map((category) => ({
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    group: (category.group && isCategoryGroup(category.group) ? category.group : "khac") as CategoryGroup,
    foodCount: category.foodCount ?? 0,
    icon: category.icon ?? null,
  }));
}

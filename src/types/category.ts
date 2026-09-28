import type { CategoryGroup } from "@/constants/categoryGroups";

/** Danh mục chọn được trên form đóng góp / combobox gộp đề xuất. */
export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  group: CategoryGroup;
  foodCount: number;
  icon: string | null;
}

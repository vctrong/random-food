import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models/Category";
import { Food } from "@/lib/models/Food";

/**
 * Tính lại `categories.foodCount` (món approved + visible) cho các danh mục bị
 * ảnh hưởng. Gọi sau mọi thao tác đổi trạng thái/hiển thị/danh mục của món —
 * đếm lại thay vì $inc để không lệch khi 1 thao tác phụ thất bại giữa chừng.
 */
export async function recountCategoryFoods(categoryIds: unknown[]): Promise<void> {
  const ids = [...new Set(categoryIds.filter(Boolean).map(String))];
  if (ids.length === 0) return;
  await connectDB();
  await Promise.all(
    ids.map(async (id) => {
      const foodCount = await Food.countDocuments({ categoryIds: id, moderationStatus: "approved", visibility: "visible" });
      await Category.updateOne({ _id: id }, { $set: { foodCount } });
    }),
  );
}

/** Dạng "bắn rồi quên" cho luồng chính — lỗi đếm không được làm hỏng thao tác đã ghi. */
export async function recountCategoriesOfFood(foodId: unknown): Promise<void> {
  try {
    await connectDB();
    const food = (await Food.findById(foodId).select("categoryIds").lean()) as { categoryIds?: unknown[] } | null;
    await recountCategoryFoods(food?.categoryIds ?? []);
  } catch (error) {
    console.error("[categoryCounts] recount failed", error);
  }
}

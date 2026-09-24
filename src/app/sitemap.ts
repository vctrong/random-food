import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/env";

/** Sinh lại tối đa mỗi ngày — đủ để món mới duyệt xuất hiện mà không query DB mỗi lần bot ghé. */
export const revalidate = 86400;

/** Trang nội dung công khai. Không gồm /dang-nhap, /dang-ky, /cai-dat (công khai nhưng không có giá trị SEO). */
const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/mon-an", changeFrequency: "daily", priority: 0.9 },
  { path: "/random", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tin-tuc", changeFrequency: "weekly", priority: 0.7 },
  { path: "/ve-chung-toi", changeFrequency: "monthly", priority: 0.5 },
];

/**
 * Món đã được FoodReviewer duyệt và đang công khai — cùng điều kiện với GET /api/foods.
 * Import DB động bên trong try: lib/mongodb.ts throw ngay lúc import nếu thiếu MONGODB_URI,
 * nên import tĩnh sẽ làm hỏng cả sitemap thay vì chỉ bỏ qua phần món ăn.
 */
async function getApprovedFoodEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const [{ connectDB }, { Food }] = await Promise.all([import("@/lib/mongodb"), import("@/lib/models/Food")]);
    await connectDB();
    const foods = (await Food.find({ moderationStatus: "approved", visibility: "visible" })
      .select("_id updatedAt")
      .lean()) as unknown as { _id: unknown; updatedAt?: Date }[];

    return foods.map((food) => ({
      url: `${SITE_URL}/mon-an/${String(food._id)}`,
      lastModified: food.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (error) {
    console.error("[sitemap] Không lấy được danh sách món, chỉ trả về trang tĩnh:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  return [...staticEntries, ...(await getApprovedFoodEntries())];
}

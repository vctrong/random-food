/**
 * Seed 7 category chính thức (taxonomy đã chốt của app trong
 * src/constants/categories.ts — không phải dữ liệu bịa) vào collection
 * `categories`. Idempotent — chạy lại nhiều lần không tạo trùng, chỉ upsert
 * theo slug. Viết bằng plain JS (không cần ts-node/tsx, tránh thêm dependency
 * mới) — nếu đổi CATEGORY_LABELS trong constants/categories.ts thì cập nhật
 * lại danh sách CATEGORIES bên dưới cho khớp.
 *
 * Chạy: node --env-file=.env.local scripts/seedCategories.mjs
 */
import mongoose from "mongoose";

const CATEGORIES = [
  { slug: "com", name: "Cơm", icon: "Utensils" },
  { slug: "bun-pho-hu-tieu", name: "Bún / Phở / Hủ tiếu", icon: "Soup" },
  { slug: "an-vat", name: "Ăn vặt", icon: "Cookie" },
  { slug: "mon-nuoc", name: "Món nước", icon: "Flame" },
  { slug: "chay", name: "Chay", icon: "Salad" },
  { slug: "banh-mi", name: "Bánh mì", icon: "Sandwich" },
  { slug: "do-uong", name: "Đồ uống", icon: "Coffee" },
];

const categorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  icon: String,
  description: String,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
});

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu biến môi trường MONGODB_URI");
  }

  await mongoose.connect(uri);
  const Category = mongoose.models.Category ?? mongoose.model("Category", categorySchema);

  for (const { slug, name, icon } of CATEGORIES) {
    await Category.updateOne(
      { slug },
      { $set: { name, slug, icon, isActive: true } },
      { upsert: true },
    );
    console.log(`✓ ${slug} → ${name}`);
  }

  await mongoose.disconnect();
  console.log("Seed categories hoàn tất.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

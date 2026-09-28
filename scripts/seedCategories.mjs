/**
 * Seed danh mục chính thức — đồng bộ đúng với DB đang chạy (5 danh mục gốc từ
 * seedFoods.mjs + "Chay" + danh mục hệ thống "Khác"), kèm `group` và
 * `nameNormalized` theo docs/database.md. Idempotent — upsert theo slug,
 * không đụng `foodCount` (tính bởi migrate:contribution-flow / lúc duyệt món).
 *
 * Chạy: node --env-file=.env.local scripts/seedCategories.mjs
 */
import mongoose from "mongoose";

const CATEGORIES = [
  { slug: "banh", name: "Bánh", icon: "🥟", group: "banh" },
  { slug: "bun", name: "Bún", icon: "🍜", group: "mon-nuoc" },
  { slug: "com", name: "Cơm", icon: "🍚", group: "com" },
  { slug: "hu-tieu", name: "Hủ tiếu", icon: "🍲", group: "mon-nuoc" },
  { slug: "che-trang-mieng", name: "Chè / Tráng miệng", icon: "🍧", group: "trang-mieng" },
  { slug: "chay", name: "Chay", icon: "🥗", group: "chay" },
  { slug: "khac", name: "Khác", icon: "🍽️", group: "khac" },
];

/** Bản JS của normalizeVietnamese (src/lib/vietnameseText.ts). */
function normalizeVietnamese(value) {
  return String(value ?? "")
    .normalize("NFC")
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      if (lower === "đ") return "d";
      const folded = lower.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return folded.length === 1 ? folded : lower;
    })
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu biến môi trường MONGODB_URI");
  }

  await mongoose.connect(uri);
  const categories = mongoose.connection.collection("categories");

  for (const { slug, name, icon, group } of CATEGORIES) {
    await categories.updateOne(
      { slug },
      {
        $set: { name, slug, icon, group, nameNormalized: normalizeVietnamese(name), isActive: true },
        $setOnInsert: { foodCount: 0, createdAt: new Date() },
      },
      { upsert: true },
    );
    console.log(`✓ ${slug} → ${name} (${group})`);
  }

  await mongoose.disconnect();
  console.log("Seed categories hoàn tất.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

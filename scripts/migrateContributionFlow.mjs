/**
 * Migration cho luồng đóng góp món/quán mới (docs/contribute-food.md):
 *  1. categories: gán `group` theo mapping đã chốt, `nameNormalized`, tính lại `foodCount`
 *     (món approved + visible); tạo danh mục "Chay" và danh mục hệ thống "Khác" nếu chưa có.
 *  2. restaurants: `nameNormalized`, `addressNormalized`, `images: []` nếu thiếu,
 *     `locationSource` = "pin_confirmed" (quán cũ đều ghim tay trên bản đồ) / "none" nếu không có toạ độ.
 *  3. categoryproposals: `nameNormalized`, `proposerIds = [proposedBy]`, `proposalCount = 1`, `foodIds = []`.
 *     Dừng nếu có 2 đề xuất pending trùng tên sau chuẩn hoá (unique index một phần sẽ không tạo được).
 *  4. Tạo index mới: categoryproposals `nameNormalized_pending_unique`, restaurants `{moderationStatus, visibility, _id}`.
 *
 * Idempotent, chỉ THÊM field — không xoá/đổi kiểu field cũ.
 * Mặc định DRY-RUN. Chạy thật: npm run migrate:contribution-flow -- --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

/** Mapping nhóm cha đã chốt cho danh mục có sẵn (theo slug). Slug không có ở đây → "khac". */
const GROUP_BY_SLUG = {
  banh: "banh",
  bun: "mon-nuoc",
  com: "com",
  "hu-tieu": "mon-nuoc",
  "che-trang-mieng": "trang-mieng",
  chay: "chay",
  khac: "khac",
};

const REQUIRED_CATEGORIES = [
  { slug: "chay", name: "Chay", icon: "🥗", group: "chay" },
  { slug: "khac", name: "Khác", icon: "🍽️", group: "khac" },
];

/** Bản JS của normalizeVietnamese (src/lib/vietnameseText.ts) — giữ đồng bộ nếu sửa bên đó. */
function normalizeVietnamese(value) {
  return String(value ?? "")
    .normalize("NFC")
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      if (lower === "đ") return "d";
      const folded = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return folded.length === 1 ? folded : lower;
    })
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const categories = db.collection("categories");
  const foods = db.collection("foods");
  const restaurants = db.collection("restaurants");
  const proposals = db.collection("categoryproposals");

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}\n`);

  // --- 3 (kiểm tra trước): đề xuất pending trùng tên ---
  const pendingProposals = await proposals.find({ status: "pending" }).toArray();
  const seen = new Map();
  const duplicates = [];
  for (const proposal of pendingProposals) {
    const key = normalizeVietnamese(proposal.name);
    if (seen.has(key)) duplicates.push(`"${proposal.name}" trùng "${seen.get(key)}"`);
    else seen.set(key, proposal.name);
  }
  if (duplicates.length > 0) {
    console.error("Dừng: có đề xuất pending trùng tên sau chuẩn hoá, xử lý tay trước:\n- " + duplicates.join("\n- "));
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  // --- 1. categories ---
  console.log("1) Danh mục");
  for (const required of REQUIRED_CATEGORIES) {
    const exists = await categories.findOne({ slug: required.slug });
    console.log(`   ${exists ? "·" : "+"} ${required.name} (${required.slug}) ${exists ? "đã có" : "sẽ tạo"}`);
    if (!exists && APPLY) {
      await categories.insertOne({
        name: required.name,
        slug: required.slug,
        icon: required.icon,
        isActive: true,
        group: required.group,
        nameNormalized: normalizeVietnamese(required.name),
        foodCount: 0,
        createdAt: new Date(),
      });
    }
  }

  const allCategories = await categories.find({}).toArray();
  for (const category of allCategories) {
    const group = category.group ?? GROUP_BY_SLUG[category.slug] ?? "khac";
    const foodCount = await foods.countDocuments({
      categoryIds: category._id,
      moderationStatus: "approved",
      visibility: "visible",
    });
    console.log(`   ${category.name.padEnd(20)} group=${group.padEnd(12)} foodCount=${foodCount}`);
    if (APPLY) {
      await categories.updateOne(
        { _id: category._id },
        { $set: { group, nameNormalized: normalizeVietnamese(category.name), foodCount } },
      );
    }
  }

  // --- 2. restaurants ---
  console.log("\n2) Quán ăn");
  const allRestaurants = await restaurants.find({}).toArray();
  let brokenLocation = 0;
  for (const restaurant of allRestaurants) {
    const hasCoordinates = Array.isArray(restaurant.location?.coordinates) && restaurant.location.coordinates.length === 2;
    if (restaurant.location && !hasCoordinates) brokenLocation++;
    const set = {
      nameNormalized: normalizeVietnamese(restaurant.name),
      addressNormalized: normalizeVietnamese(restaurant.address),
    };
    if (!Array.isArray(restaurant.images)) set.images = [];
    if (!restaurant.locationSource) set.locationSource = hasCoordinates ? "pin_confirmed" : "none";
    if (APPLY) await restaurants.updateOne({ _id: restaurant._id }, { $set: set });
  }
  console.log(`   ${allRestaurants.length} quán sẽ được cập nhật field chuẩn hoá/locationSource.`);
  if (brokenLocation > 0) console.log(`   ⚠ ${brokenLocation} quán có location thiếu coordinates — cần xem tay.`);

  // --- 3. categoryproposals ---
  console.log("\n3) Đề xuất danh mục");
  const allProposals = await proposals.find({}).toArray();
  for (const proposal of allProposals) {
    const set = { nameNormalized: normalizeVietnamese(proposal.name) };
    if (!Array.isArray(proposal.proposerIds)) set.proposerIds = proposal.proposedBy ? [proposal.proposedBy] : [];
    if (typeof proposal.proposalCount !== "number") set.proposalCount = 1;
    if (!Array.isArray(proposal.foodIds)) set.foodIds = [];
    if (APPLY) await proposals.updateOne({ _id: proposal._id }, { $set: set });
  }
  console.log(`   ${allProposals.length} đề xuất (${pendingProposals.length} pending).`);

  // --- 4. indexes ---
  console.log("\n4) Index");
  console.log("   categoryproposals.nameNormalized_pending_unique, restaurants.{moderationStatus,visibility,_id}");
  if (APPLY) {
    await proposals.createIndex(
      { nameNormalized: 1 },
      { unique: true, partialFilterExpression: { status: "pending" }, name: "nameNormalized_pending_unique" },
    );
    await restaurants.createIndex({ moderationStatus: 1, visibility: 1, _id: -1 });
  }

  console.log(APPLY ? "\n✓ Hoàn tất." : "\nThêm --apply để chạy thật.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

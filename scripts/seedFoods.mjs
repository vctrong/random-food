/**
 * Seed 5 món ăn ẢO (chuyển từ bản mongosh cũ example/seed.js, đã xoá) vào DB test `random_food_test`, kèm
 * upload 5 ảnh thật trong example/*.jpg lên Cloudinary rồi gắn secure_url vào
 * thay cho link picsum.photos placeholder ban đầu.
 *
 * Idempotent — chạy lại nhiều lần chỉ upsert theo email/slug/name, không tạo trùng.
 * Viết bằng plain JS (không cần ts-node/tsx), theo đúng schema đã chốt trong
 * src/lib/models/ và docs/database.md.
 *
 * Chạy: node --env-file=.env.local scripts/seedFoods.mjs
 */
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE_DIR = path.join(__dirname, "..", "example");
const CLOUDINARY_FOLDER = "nayangi/seed-foods";

const SEED_USER_EMAIL = "seed.reviewer@nayangi.test";

const CATEGORY_DEFS = [
  { name: "Bánh", slug: "banh", icon: "🥟" },
  { name: "Bún", slug: "bun", icon: "🍜" },
  { name: "Cơm", slug: "com", icon: "🍚" },
  { name: "Hủ tiếu", slug: "hu-tieu", icon: "🍲" },
  { name: "Chè / Tráng miệng", slug: "che-trang-mieng", icon: "🍧" },
];

const RESTAURANT_DEFS = [
  {
    name: "Quán Bánh Cống Cô Sáu",
    address: "45 Mậu Thân, Ninh Kiều, Cần Thơ",
    coordinates: [105.7628, 10.0296],
  },
  {
    name: "Bún Bò Huế Mệ Nội",
    address: "12 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ",
    coordinates: [105.7469, 10.0333],
  },
  {
    name: "Cơm Tấm Sài Gòn Xưa",
    address: "88 30 Tháng 4, Ninh Kiều, Cần Thơ",
    coordinates: [105.7712, 10.0261],
  },
  {
    name: "Hủ Tiếu Nam Vang Chú Lâm",
    address: "23 Hùng Vương, Ninh Kiều, Cần Thơ",
    coordinates: [105.7801, 10.0355],
  },
  {
    name: "Chè Bưởi Dì Ba",
    address: "67 Trần Hưng Đạo, Ninh Kiều, Cần Thơ",
    coordinates: [105.7684, 10.0299],
  },
];

const FOOD_DEFS = [
  {
    restaurantIndex: 0,
    name: "Bánh cống Cần Thơ",
    description:
      "Bánh cống chiên giòn nhân đậu xanh, tôm và thịt bằm, ăn kèm rau sống và nước mắm chua ngọt — đặc sản miền Tây.",
    categorySlug: "banh",
    eatingLevels: ["snack"],
    imageFile: "banh-cong-can-tho.jpg",
    priceRange: { min: 10000, max: 20000 },
    caloriesEstimate: { min: 250, max: 350 },
    tags: ["bánh", "chiên", "đặc sản miền Tây", "ăn vặt"],
    avgRating: 4.5,
    ratingCount: 12,
  },
  {
    restaurantIndex: 1,
    name: "Bún bò Huế đặc biệt",
    description:
      "Bún bò Huế cay nồng, nước dùng đậm đà từ xương bò và sả, đầy đủ bắp bò, giò heo, chả cua và huyết.",
    categorySlug: "bun",
    eatingLevels: ["normal", "hearty"],
    imageFile: "bun-bo-hue-dac-biet.jpg",
    priceRange: { min: 35000, max: 55000 },
    caloriesEstimate: { min: 500, max: 700 },
    tags: ["bún", "cay", "nước lèo", "đặc sản Huế"],
    avgRating: 4.7,
    ratingCount: 25,
  },
  {
    restaurantIndex: 2,
    name: "Cơm tấm sườn bì chả",
    description:
      "Cơm tấm hạt rời truyền thống, sườn nướng thơm lừng, bì trộn thính, chả trứng hấp và nước mắm pha chua ngọt.",
    categorySlug: "com",
    eatingLevels: ["hearty", "full"],
    imageFile: "com-tam-suon-bi-cha.jpg",
    priceRange: { min: 30000, max: 45000 },
    caloriesEstimate: { min: 600, max: 850 },
    tags: ["cơm", "nướng", "no bụng", "món chính"],
    avgRating: 4.6,
    ratingCount: 30,
  },
  {
    restaurantIndex: 3,
    name: "Hủ tiếu Nam Vang",
    description:
      "Hủ tiếu khô hoặc nước với tôm, thịt bằm, gan heo, trứng cút và giá hẹ — nước dùng thanh ngọt kiểu Nam Vang.",
    categorySlug: "hu-tieu",
    eatingLevels: ["normal", "hearty"],
    imageFile: "hu-tieu-nam-vang.jpg",
    priceRange: { min: 30000, max: 50000 },
    caloriesEstimate: { min: 450, max: 650 },
    tags: ["hủ tiếu", "nước lèo", "hải sản", "món chính"],
    avgRating: 4.4,
    ratingCount: 18,
  },
  {
    restaurantIndex: 4,
    name: "Chè bưởi Cần Thơ",
    description:
      "Chè bưởi mát lạnh với cùi bưởi giòn sần sật, đậu xanh, nước cốt dừa béo ngậy — món tráng miệng giải nhiệt.",
    categorySlug: "che-trang-mieng",
    eatingLevels: ["snack"],
    imageFile: "che-buoi-can-tho.jpg",
    priceRange: { min: 15000, max: 25000 },
    caloriesEstimate: { min: 200, max: 300 },
    tags: ["chè", "tráng miệng", "giải nhiệt", "đặc sản miền Tây"],
    avgRating: 4.8,
    ratingCount: 20,
  },
];

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  phone: { type: String },
  role: { type: String, enum: ["user", "foodreviewer", "admin"], default: "user" },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  googleId: { type: String },
  accountStatus: { type: String, enum: ["active", "banned"], default: "active" },
  warningCount: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  sessionVersion: { type: Number, default: 0 },
  lastActiveAt: { type: Date },
});

const categorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  icon: String,
  description: String,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },
  openingHours: { type: String },
  moderationStatus: { type: String, enum: ["pending", "approved", "rejected", "needs_revision"], default: "pending" },
  visibility: { type: String, enum: ["visible", "hidden", "deleted"], default: "visible" },
  moderationNote: { type: String },
  verification: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    note: { type: String },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const foodSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  description: { type: String },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  eatingLevels: { type: [{ type: String, enum: ["snack", "normal", "hearty", "full"] }], required: true },
  images: [{ type: String }],
  priceRange: { min: { type: Number }, max: { type: Number } },
  caloriesEstimate: { min: { type: Number }, max: { type: Number } },
  tags: [{ type: String }],
  moderationStatus: { type: String, enum: ["pending", "approved", "rejected", "needs_revision"], default: "pending" },
  visibility: { type: String, enum: ["visible", "hidden", "deleted"], default: "visible" },
  moderationNote: { type: String },
  verification: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    note: { type: String },
  },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function uploadSeedImages() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const urls = {};
  for (const food of FOOD_DEFS) {
    const localPath = path.join(EXAMPLE_DIR, food.imageFile);
    const publicId = path.parse(food.imageFile).name;
    const result = await cloudinary.uploader.upload(localPath, {
      folder: CLOUDINARY_FOLDER,
      public_id: publicId,
      overwrite: true,
    });
    urls[food.imageFile] = result.secure_url;
    console.log(`✓ Đã tải ảnh lên Cloudinary: ${food.imageFile} → ${result.secure_url}`);
  }
  return urls;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");
  if (!/random_food_test/.test(uri)) {
    throw new Error(
      `MONGODB_URI có vẻ không trỏ tới DB test (random_food_test): ${uri.split("/").pop()}. Dừng lại để an toàn.`,
    );
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Thiếu biến môi trường Cloudinary (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)");
  }

  const imageUrls = await uploadSeedImages();

  await mongoose.connect(uri);
  const User = mongoose.models.User ?? mongoose.model("User", userSchema);
  const Category = mongoose.models.Category ?? mongoose.model("Category", categorySchema);
  const Restaurant = mongoose.models.Restaurant ?? mongoose.model("Restaurant", restaurantSchema);
  const Food = mongoose.models.Food ?? mongoose.model("Food", foodSchema);

  const now = new Date();

  await User.updateOne(
    { email: SEED_USER_EMAIL },
    {
      $set: {
        email: SEED_USER_EMAIL,
        name: "Seed FoodReviewer",
        avatarUrl: "https://i.pravatar.cc/150?u=seed-reviewer",
        phone: "0900000000",
        role: "foodreviewer",
        authProvider: "local",
        accountStatus: "active",
        isVerified: true,
        lastLoginAt: now,
        lastActiveAt: now,
      },
      $setOnInsert: { createdAt: now, sessionVersion: 0, warningCount: 0, passwordHash: null },
    },
    { upsert: true },
  );
  const seedUser = await User.findOne({ email: SEED_USER_EMAIL });
  console.log(`✓ Seed user sẵn sàng: ${seedUser.email}`);

  const categoryIdBySlug = {};
  for (const c of CATEGORY_DEFS) {
    await Category.updateOne(
      { slug: c.slug },
      { $set: { name: c.name, slug: c.slug, icon: c.icon, description: `Các món thuộc nhóm ${c.name}`, isActive: true } },
      { upsert: true },
    );
    const category = await Category.findOne({ slug: c.slug });
    categoryIdBySlug[c.slug] = category._id;
    console.log(`✓ Category sẵn sàng: ${c.slug}`);
  }

  const restaurantIds = [];
  for (const r of RESTAURANT_DEFS) {
    await Restaurant.updateOne(
      { name: r.name },
      {
        $set: {
          name: r.name,
          address: r.address,
          location: { type: "Point", coordinates: r.coordinates },
          openingHours: "06:00 - 21:00",
          moderationStatus: "approved",
          visibility: "visible",
          moderationNote: null,
          verification: { verifiedBy: seedUser._id, verifiedAt: now, note: "Dữ liệu seed test — đã xác minh giả lập" },
          createdBy: seedUser._id,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    const restaurant = await Restaurant.findOne({ name: r.name });
    restaurantIds.push(restaurant._id);
    console.log(`✓ Restaurant sẵn sàng: ${r.name}`);
  }

  for (const food of FOOD_DEFS) {
    await Food.updateOne(
      { name: food.name },
      {
        $set: {
          restaurantId: restaurantIds[food.restaurantIndex],
          name: food.name,
          description: food.description,
          categoryIds: [categoryIdBySlug[food.categorySlug]],
          eatingLevels: food.eatingLevels,
          images: [imageUrls[food.imageFile]],
          priceRange: food.priceRange,
          caloriesEstimate: food.caloriesEstimate,
          tags: food.tags,
          moderationStatus: "approved",
          visibility: "visible",
          moderationNote: null,
          verification: { verifiedBy: seedUser._id, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
          avgRating: food.avgRating,
          ratingCount: food.ratingCount,
          createdBy: seedUser._id,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    console.log(`✓ Food sẵn sàng: ${food.name}`);
  }

  await mongoose.disconnect();
  console.log(
    `\nHoàn tất: 1 user, ${CATEGORY_DEFS.length} category, ${RESTAURANT_DEFS.length} restaurant, ${FOOD_DEFS.length} món ăn (ảnh Cloudinary) trên DB test.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

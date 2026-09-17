/**
 * seed-foods.js — Dữ liệu ẢO cho DB test `random_food_test`
 * Tự tạo luôn user / categories / restaurant mẫu rồi gắn ObjectId thật vào 5 món ăn,
 * chạy xong là insert được ngay, không cần sửa tay.
 *
 * Chạy:
 *   mongosh "mongodb+srv://<uri>/random_food_test" seed-foods.js
 *   (hoặc mongosh local: mongosh random_food_test seed-foods.js)
 */

const now = new Date();

// ====== 1. User ảo (đóng vai trò createdBy / verifiedBy) ======
const userRes = db.users.insertOne({
    email: "seed.reviewer@nayangi.test",
    passwordHash: null,
    name: "Seed FoodReviewer",
    avatarUrl: "https://i.pravatar.cc/150?u=seed-reviewer",
    phone: "0900000000",
    role: "foodreviewer",
    authProvider: "local",
    googleId: null,
    accountStatus: "active",
    warningCount: 0,
    isVerified: true,
    lastLoginAt: now,
    createdAt: now,
    sessionVersion: 0,
    lastActiveAt: now
});
const ADMIN_USER_ID = userRes.insertedId;

// ====== 2. Categories ảo ======
const categoryDefs = [
    { name: "Bánh", slug: "banh", icon: "🥟" },
    { name: "Bún", slug: "bun", icon: "🍜" },
    { name: "Cơm", slug: "com", icon: "🍚" },
    { name: "Hủ tiếu", slug: "hu-tieu", icon: "🍲" },
    { name: "Chè / Tráng miệng", slug: "che-trang-mieng", icon: "🍧" }
];
const CATEGORY_IDS = {};
categoryDefs.forEach((c) => {
    const res = db.categories.insertOne({
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        description: `Các món thuộc nhóm ${c.name}`,
        isActive: true,
        createdAt: now
    });
    CATEGORY_IDS[c.slug] = res.insertedId;
});

// ====== 3. Restaurants ảo ======
const restaurantDefs = [
    {
        name: "Quán Bánh Cống Cô Sáu",
        address: "45 Mậu Thân, Ninh Kiều, Cần Thơ",
        coordinates: [105.7628, 10.0296]
    },
    {
        name: "Bún Bò Huế Mệ Nội",
        address: "12 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ",
        coordinates: [105.7469, 10.0333]
    },
    {
        name: "Cơm Tấm Sài Gòn Xưa",
        address: "88 30 Tháng 4, Ninh Kiều, Cần Thơ",
        coordinates: [105.7712, 10.0261]
    },
    {
        name: "Hủ Tiếu Nam Vang Chú Lâm",
        address: "23 Hùng Vương, Ninh Kiều, Cần Thơ",
        coordinates: [105.7801, 10.0355]
    },
    {
        name: "Chè Bưởi Dì Ba",
        address: "67 Trần Hưng Đạo, Ninh Kiều, Cần Thơ",
        coordinates: [105.7684, 10.0299]
    }
];
const RESTAURANT_IDS = restaurantDefs.map((r) => {
    const res = db.restaurants.insertOne({
        name: r.name,
        address: r.address,
        location: { type: "Point", coordinates: r.coordinates },
        openingHours: "06:00 - 21:00",
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: {
            verifiedBy: ADMIN_USER_ID,
            verifiedAt: now,
            note: "Dữ liệu seed test — đã xác minh giả lập"
        },
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    });
    return res.insertedId;
});

// ====== 4. 5 món ăn ======
const foods = [
    {
        restaurantId: RESTAURANT_IDS[0],
        name: "Bánh cống Cần Thơ",
        description:
            "Bánh cống chiên giòn nhân đậu xanh, tôm và thịt bằm, ăn kèm rau sống và nước mắm chua ngọt — đặc sản miền Tây.",
        categoryIds: [CATEGORY_IDS.banh],
        eatingLevels: ["snack"],
        images: ["https://picsum.photos/seed/banh-cong-can-tho/800/600"],
        priceRange: { min: 10000, max: 20000 },
        caloriesEstimate: { min: 250, max: 350 },
        tags: ["bánh", "chiên", "đặc sản miền Tây", "ăn vặt"],
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: { verifiedBy: ADMIN_USER_ID, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
        avgRating: 4.5,
        ratingCount: 12,
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    },
    {
        restaurantId: RESTAURANT_IDS[1],
        name: "Bún bò Huế đặc biệt",
        description:
            "Bún bò Huế cay nồng, nước dùng đậm đà từ xương bò và sả, đầy đủ bắp bò, giò heo, chả cua và huyết.",
        categoryIds: [CATEGORY_IDS.bun],
        eatingLevels: ["normal", "hearty"],
        images: ["https://picsum.photos/seed/bun-bo-hue-dac-biet/800/600"],
        priceRange: { min: 35000, max: 55000 },
        caloriesEstimate: { min: 500, max: 700 },
        tags: ["bún", "cay", "nước lèo", "đặc sản Huế"],
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: { verifiedBy: ADMIN_USER_ID, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
        avgRating: 4.7,
        ratingCount: 25,
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    },
    {
        restaurantId: RESTAURANT_IDS[2],
        name: "Cơm tấm sườn bì chả",
        description:
            "Cơm tấm hạt rời truyền thống, sườn nướng thơm lừng, bì trộn thính, chả trứng hấp và nước mắm pha chua ngọt.",
        categoryIds: [CATEGORY_IDS.com],
        eatingLevels: ["hearty", "full"],
        images: ["https://picsum.photos/seed/com-tam-suon-bi-cha/800/600"],
        priceRange: { min: 30000, max: 45000 },
        caloriesEstimate: { min: 600, max: 850 },
        tags: ["cơm", "nướng", "no bụng", "món chính"],
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: { verifiedBy: ADMIN_USER_ID, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
        avgRating: 4.6,
        ratingCount: 30,
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    },
    {
        restaurantId: RESTAURANT_IDS[3],
        name: "Hủ tiếu Nam Vang",
        description:
            "Hủ tiếu khô hoặc nước với tôm, thịt bằm, gan heo, trứng cút và giá hẹ — nước dùng thanh ngọt kiểu Nam Vang.",
        categoryIds: [CATEGORY_IDS["hu-tieu"]],
        eatingLevels: ["normal", "hearty"],
        images: ["https://picsum.photos/seed/hu-tieu-nam-vang/800/600"],
        priceRange: { min: 30000, max: 50000 },
        caloriesEstimate: { min: 450, max: 650 },
        tags: ["hủ tiếu", "nước lèo", "hải sản", "món chính"],
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: { verifiedBy: ADMIN_USER_ID, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
        avgRating: 4.4,
        ratingCount: 18,
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    },
    {
        restaurantId: RESTAURANT_IDS[4],
        name: "Chè bưởi Cần Thơ",
        description:
            "Chè bưởi mát lạnh với cùi bưởi giòn sần sật, đậu xanh, nước cốt dừa béo ngậy — món tráng miệng giải nhiệt.",
        categoryIds: [CATEGORY_IDS["che-trang-mieng"]],
        eatingLevels: ["snack"],
        images: ["https://picsum.photos/seed/che-buoi-can-tho/800/600"],
        priceRange: { min: 15000, max: 25000 },
        caloriesEstimate: { min: 200, max: 300 },
        tags: ["chè", "tráng miệng", "giải nhiệt", "đặc sản miền Tây"],
        moderationStatus: "approved",
        visibility: "visible",
        moderationNote: null,
        verification: { verifiedBy: ADMIN_USER_ID, verifiedAt: now, note: "Đã kiểm duyệt (seed)" },
        avgRating: 4.8,
        ratingCount: 20,
        createdBy: ADMIN_USER_ID,
        createdAt: now,
        updatedAt: now
    }
];

const foodRes = db.foods.insertMany(foods);

print(`Đã tạo 1 user, ${categoryDefs.length} category, ${restaurantDefs.length} restaurant, ${foods.length} món ăn (random_food_test).`);
print("Food IDs:", JSON.stringify(foodRes.insertedIds));
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import { Restaurant } from "@/lib/models/Restaurant";
import { Category } from "@/lib/models/Category";
import { uploadImageFile } from "@/lib/cloudinary";

export async function GET() {
  await connectDB();

  const foods = await Food.find({ moderationStatus: "approved", visibility: "visible" })
    .sort({ createdAt: -1 })
    .populate("categoryIds", "name slug icon")
    .populate("restaurantId", "name address location openingHours")
    .lean();

  return NextResponse.json(
    foods.map((food) => {
      const restaurant = food.restaurantId as unknown as {
        _id: string;
        name: string;
        address: string;
        location?: { coordinates?: [number, number] };
        openingHours?: string;
      } | null;
      const categories = (food.categoryIds ?? []) as unknown as {
        _id: string;
        name: string;
        slug: string;
        icon?: string;
      }[];
      const coordinates = restaurant?.location?.coordinates;

      return {
        id: String(food._id),
        name: food.name,
        description: food.description ?? "",
        images: food.images ?? [],
        priceMin: food.priceRange?.min ?? null,
        priceMax: food.priceRange?.max ?? null,
        caloriesMin: food.caloriesEstimate?.min ?? null,
        caloriesMax: food.caloriesEstimate?.max ?? null,
        eatingLevels: food.eatingLevels ?? [],
        tags: food.tags ?? [],
        avgRating: food.avgRating ?? 0,
        ratingCount: food.ratingCount ?? 0,
        categories: categories.map((category) => ({
          id: String(category._id),
          name: category.name,
          slug: category.slug,
          icon: category.icon ?? null,
        })),
        restaurant: restaurant
          ? {
              id: String(restaurant._id),
              name: restaurant.name,
              address: restaurant.address,
              // GeoJSON lưu [lng, lat] — đổi sang {lat, lng} cho dễ dùng ở Leaflet.
              location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
              openingHours: restaurant.openingHours?.trim() || null,
            }
          : null,
      };
    }),
  );
}

const EATING_LEVEL_VALUES = new Set(["snack", "normal", "hearty", "full"]);

/**
 * User đóng góp Food mới (UC-U10, BR-C01→C07). Food + (nếu quán chưa tồn tại)
 * Restaurant đều tạo ở trạng thái pending — FoodReviewer duyệt sau. Nếu chọn
 * quán đã approved sẵn thì chỉ tạo Food, không đụng tới Restaurant (BR-C07).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để đóng góp món ăn." }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const formData = await request.formData();

  const name = formData.get("name");
  const description = formData.get("description");
  const priceMin = formData.get("priceMin");
  const priceMax = formData.get("priceMax");
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const eatingLevels = formData.getAll("eatingLevels").map(String).filter(Boolean);
  const images = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);

  const restaurantMode = formData.get("restaurantMode");
  const restaurantId = formData.get("restaurantId");
  const restaurantName = formData.get("restaurantName");
  const restaurantAddress = formData.get("restaurantAddress");
  const restaurantLat = formData.get("restaurantLat");
  const restaurantLng = formData.get("restaurantLng");

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Thiếu tên món ăn." }, { status: 400 });
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Thiếu mô tả món ăn." }, { status: 400 });
  }
  if (images.length === 0) {
    return NextResponse.json({ error: "Cần ít nhất 1 ảnh món ăn." }, { status: 400 });
  }
  const min = Number(priceMin);
  const max = Number(priceMax);
  if (typeof priceMin !== "string" || typeof priceMax !== "string" || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return NextResponse.json({ error: "Giá tham khảo không hợp lệ." }, { status: 400 });
  }
  if (categoryIds.length === 0) {
    return NextResponse.json({ error: "Chọn ít nhất 1 danh mục." }, { status: 400 });
  }
  if (eatingLevels.length === 0 || eatingLevels.some((level) => !EATING_LEVEL_VALUES.has(level))) {
    return NextResponse.json({ error: "Chọn ít nhất 1 mức độ ăn hợp lệ." }, { status: 400 });
  }

  await connectDB();

  const validCategoryCount = await Category.countDocuments({ _id: { $in: categoryIds }, isActive: true });
  if (validCategoryCount !== categoryIds.length) {
    return NextResponse.json({ error: "Có danh mục không hợp lệ." }, { status: 400 });
  }

  let finalRestaurantId: string;

  if (restaurantMode === "existing") {
    if (typeof restaurantId !== "string" || !restaurantId) {
      return NextResponse.json({ error: "Thiếu quán ăn." }, { status: 400 });
    }
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      moderationStatus: "approved",
      visibility: "visible",
    }).lean();
    if (!restaurant) {
      return NextResponse.json({ error: "Quán ăn không hợp lệ." }, { status: 400 });
    }
    finalRestaurantId = restaurantId;
  } else {
    const lat = Number(restaurantLat);
    const lng = Number(restaurantLng);
    if (
      typeof restaurantName !== "string" ||
      !restaurantName.trim() ||
      typeof restaurantAddress !== "string" ||
      !restaurantAddress.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json({ error: "Thiếu tên, địa chỉ hoặc vị trí quán ăn." }, { status: 400 });
    }
    const newRestaurant = await Restaurant.create({
      name: restaurantName.trim(),
      address: restaurantAddress.trim(),
      location: { type: "Point", coordinates: [lng, lat] },
      moderationStatus: "pending",
      visibility: "visible",
      createdBy: userId,
    });
    finalRestaurantId = String(newRestaurant._id);
  }

  const imageUrls = await Promise.all(images.map((file) => uploadImageFile(file, "nayangi/foods")));

  const food = await Food.create({
    restaurantId: finalRestaurantId,
    name: name.trim(),
    description: description.trim(),
    categoryIds,
    eatingLevels,
    images: imageUrls,
    priceRange: { min, max },
    moderationStatus: "pending",
    visibility: "visible",
    createdBy: userId,
  });

  return NextResponse.json({ success: true, id: String(food._id) }, { status: 201 });
}

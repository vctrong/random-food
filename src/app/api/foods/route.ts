import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
// Đăng ký model để .populate() bên dưới hoạt động.
import "@/lib/models/Restaurant";
import "@/lib/models/Category";
import { requireAuth } from "@/lib/requireAuth";
import { foodSubmissionSchema, submitFood, type FoodSubmissionError } from "@/lib/foodSubmission";

export async function GET() {
  await connectDB();

  const foods = await Food.find({ moderationStatus: "approved", visibility: "visible" })
    .sort({ createdAt: -1 })
    .populate("categoryIds", "name slug icon")
    .populate("restaurantId", "name address location openingHours images")
    .lean();

  return NextResponse.json(
    foods.map((food) => {
      const restaurant = food.restaurantId as unknown as {
        _id: string;
        name: string;
        address: string;
        location?: { coordinates?: [number, number] };
        openingHours?: string;
        images?: string[];
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
              images: restaurant.images ?? [],
            }
          : null,
      };
    }),
  );
}

const SUBMISSION_ERRORS: Record<FoodSubmissionError, { message: string; status: number }> = {
  RATE_LIMITED: { message: "Bạn gửi hơi nhiều món trong 1 giờ, nghỉ chút rồi gửi tiếp nha.", status: 429 },
  INVALID_PRICE: { message: "Giá tham khảo không hợp lệ.", status: 400 },
  INVALID_EATING_LEVEL: { message: "Chọn ít nhất 1 mức độ ăn hợp lệ.", status: 400 },
  INVALID_CATEGORY: { message: "Chọn ít nhất 1 danh mục hợp lệ (hoặc đề xuất danh mục mới).", status: 400 },
  TOO_MANY_CATEGORIES: { message: "Mỗi món tối đa 3 danh mục, tính cả danh mục đề xuất.", status: 400 },
  INVALID_IMAGES: { message: "Ảnh tải lên không hợp lệ, thử tải lại ảnh nha.", status: 400 },
  INVALID_RESTAURANT: { message: "Quán ăn không hợp lệ hoặc chưa được duyệt.", status: 400 },
  INVALID_LOCATION: { message: "Vị trí quán không hợp lệ.", status: 400 },
};

/** UC-U10: user đóng góp món (+ quán mới) — logic ở lib/foodSubmission.ts. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: "Vui lòng đăng nhập để đóng góp món ăn." }, { status: 401 });
  }

  const parsed = foodSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin món ăn chưa đầy đủ hoặc không hợp lệ." }, { status: 400 });
  }

  const result = await submitFood(auth.id, parsed.data);
  if (result.error) {
    const { message, status } = SUBMISSION_ERRORS[result.error];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ success: true, id: result.id }, { status: 201 });
}

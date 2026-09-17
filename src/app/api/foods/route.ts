import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Food } from "@/lib/models/Food";
import "@/lib/models/Category";
import "@/lib/models/Restaurant";

export async function GET() {
  await connectDB();

  const foods = await Food.find({ moderationStatus: "approved", visibility: "visible" })
    .sort({ createdAt: -1 })
    .populate("categoryIds", "name slug icon")
    .populate("restaurantId", "name address location")
    .lean();

  return NextResponse.json(
    foods.map((food) => {
      const restaurant = food.restaurantId as unknown as {
        _id: string;
        name: string;
        address: string;
        location?: { coordinates?: [number, number] };
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
            }
          : null,
      };
    }),
  );
}

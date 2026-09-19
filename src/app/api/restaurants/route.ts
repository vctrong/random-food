import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/lib/models/Restaurant";

/**
 * Tìm quán đã tồn tại để User chọn khi đóng góp món mới (BR-C07: nếu Restaurant
 * đã approved sẵn, không cần tạo/duyệt lại). Chỉ trả quán approved + visible —
 * không lộ quán pending/hidden của người khác.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  await connectDB();

  const filter: Record<string, unknown> = {
    moderationStatus: "approved",
    visibility: "visible",
  };
  if (q) {
    filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const restaurants = await Restaurant.find(filter).sort({ name: 1 }).limit(20).lean();

  return NextResponse.json(
    restaurants.map((restaurant) => {
      const coordinates = restaurant.location?.coordinates as [number, number] | undefined;
      return {
        id: String(restaurant._id),
        name: restaurant.name,
        address: restaurant.address,
        location: coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null,
      };
    }),
  );
}

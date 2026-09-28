import { NextResponse } from "next/server";
import { findNearbyRestaurants } from "@/lib/restaurantSearch";

/** Quán đã duyệt trong 300m quanh vị trí đang ghim khi tạo quán mới. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Toạ độ không hợp lệ." }, { status: 400 });
  }
  return NextResponse.json({ items: await findNearbyRestaurants({ lat, lng }) });
}

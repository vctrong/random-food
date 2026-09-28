import { NextResponse } from "next/server";
import { listRestaurants } from "@/lib/restaurantSearch";

/**
 * Danh sách/tìm quán đã duyệt để chọn khi đóng góp món (BR-C07) — chỉ quán
 * approved + visible, không lộ quán pending/hidden của người khác.
 * Query: `q` (từ khoá), `cursor` (trang kế), `lat`/`lng` (ưu tiên gần nhất).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasLocation =
    searchParams.has("lat") && searchParams.has("lng") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const page = await listRestaurants({
    q,
    cursor: searchParams.get("cursor"),
    near: hasLocation ? { lat, lng } : null,
  });
  return NextResponse.json(page);
}

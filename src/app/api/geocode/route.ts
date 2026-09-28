import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/nominatim";

/**
 * Proxy geocode (địa chỉ chữ → toạ độ) qua Nominatim — xem lib/nominatim.ts.
 * Client chỉ gọi khi rời ô địa chỉ/nhấn Enter, không gọi theo từng phím.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) return NextResponse.json({ results: [] });

  const outcome = await geocodeAddress(q);
  if (!outcome.ok) {
    return NextResponse.json({ results: [], error: "Chưa tìm được vị trí lúc này, bạn ghim tay trên bản đồ nha." }, { status: 503 });
  }
  return NextResponse.json({ results: outcome.data });
}

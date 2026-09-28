import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/nominatim";

/** Proxy reverse geocode (toạ độ → địa chỉ chữ) qua Nominatim — xem lib/nominatim.ts. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Toạ độ không hợp lệ." }, { status: 400 });
  }

  const outcome = await reverseGeocode(lat, lng);
  if (!outcome.ok) return NextResponse.json({ address: null }, { status: 503 });
  return NextResponse.json({ address: outcome.data });
}

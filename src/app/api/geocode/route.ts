import { NextResponse } from "next/server";

/**
 * Proxy tìm kiếm địa chỉ qua Nominatim (OSM) — chỉ dùng để gợi ý vị trí trên
 * LocationPicker, không phải nguồn toạ độ chính thức (CLAUDE.md mục 7.1/7.3).
 * Server-to-server nên phải tự set User-Agent theo yêu cầu chính sách dùng của
 * Nominatim; không gọi lặp/song song để tránh vượt giới hạn ~1 request/giây.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", q);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("limit", "5");
  nominatimUrl.searchParams.set("countrycodes", "vn");
  // Ưu tiên khu vực Cần Thơ (viewbox lỏng), không loại trừ kết quả ngoài vùng.
  nominatimUrl.searchParams.set("viewbox", "105.5,10.25,105.95,9.85");
  nominatimUrl.searchParams.set("bounded", "0");

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "NayAnGi/1.0 (nayangi-can-tho food app)",
      "Accept-Language": "vi",
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Không tìm được vị trí, vui lòng thử lại." }, { status: 502 });
  }

  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return NextResponse.json(
    results.map((result) => ({
      label: result.display_name,
      lat: Number(result.lat),
      lng: Number(result.lon),
    })),
  );
}

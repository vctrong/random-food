import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewerRole";
import { getBannerAnnouncement } from "@/lib/announcements";

/** Banner trang chủ: bài quan trọng/bảo trì đang hiển thị mới nhất (hoặc null). */
export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json(await getBannerAnnouncement(viewer.role));
}

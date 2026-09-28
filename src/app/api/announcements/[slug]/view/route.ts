import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewerRole";
import { incrementAnnouncementView } from "@/lib/announcements";
import { hitRateLimit } from "@/lib/rateLimit";

const VIEWS_PER_WINDOW = 60;
const WINDOW_MS = 10 * 60 * 1000;

/** Tăng lượt xem (client gọi 1 lần / phiên trình duyệt). Giới hạn theo IP để khó thổi số. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const limit = await hitRateLimit(`announcement:view:ip:${ip}`, VIEWS_PER_WINDOW, WINDOW_MS);
  if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const viewer = await getViewer();
  const counted = await incrementAnnouncementView(slug, viewer.role);
  return NextResponse.json({ ok: counted });
}

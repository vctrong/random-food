import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewerRole";
import { getPublicAnnouncement } from "@/lib/announcements";

/** Chi tiết — không trong đối tượng / chưa đăng / hết hạn đều trả 404 như không tồn tại. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();
  const announcement = await getPublicAnnouncement(slug, viewer.role);
  if (!announcement) return NextResponse.json({ error: "Không tìm thấy thông báo." }, { status: 404 });
  return NextResponse.json(announcement);
}

import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewerRole";
import { listPublicAnnouncements, listUnseenAnnouncements } from "@/lib/announcements";

/** Danh sách đang hiển thị theo role. `?unseen=1` (cần đăng nhập): bài chưa xem cho dropdown chuông. */
export async function GET(request: Request) {
  const viewer = await getViewer();
  const unseen = new URL(request.url).searchParams.get("unseen") === "1";

  if (unseen) {
    if (!viewer.id || !viewer.role) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    return NextResponse.json(await listUnseenAnnouncements(viewer.id, viewer.role));
  }
  return NextResponse.json(await listPublicAnnouncements(viewer.role));
}

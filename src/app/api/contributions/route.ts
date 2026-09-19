import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getContributionOverview } from "@/lib/achievements";

/** UC-U11: đóng góp của user kèm trạng thái kiểm duyệt + phản hồi, và thành tựu đã mở khoá. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  return NextResponse.json(await getContributionOverview(auth.id));
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ReportCase } from "@/lib/models/ReportCase";
import { countUnreadNotifications } from "@/lib/notifications/inbox";
import { countUnseenAnnouncements } from "@/lib/announcements";
import { getPendingQueueCount } from "@/lib/reviewerData";
import type { UnreadCountResponse } from "@/types/notification";

/** Số pending cho badge menu — chỉ con số, dữ liệu thật vẫn qua API có kiểm quyền của từng khu vực. */
async function getPendingCounts(role: string): Promise<UnreadCountResponse["pending"]> {
  if (role !== "foodreviewer" && role !== "admin") return null;
  await connectDB();
  const [reviewQueue, reportCases] = await Promise.all([
    getPendingQueueCount(),
    role === "admin" ? ReportCase.countDocuments({ status: "pending" }) : Promise.resolve(null),
  ]);
  return { reviewQueue, reportCases };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const role = user.role ?? "user";
  const [notifications, announcements, pending] = await Promise.all([
    countUnreadNotifications(user.id),
    countUnseenAnnouncements(user.id, role),
    getPendingCounts(role),
  ]);
  const body: UnreadCountResponse = { notifications, announcements, total: notifications + announcements, pending };
  return NextResponse.json(body);
}

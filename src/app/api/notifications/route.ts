import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isValidObjectId } from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json(
    notifications.map((notification) => ({
      id: String(notification._id),
      type: notification.type,
      message: notification.message,
      relatedId: notification.relatedId ? String(notification.relatedId) : null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    })),
  );
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json();
  const { id, markAllRead } = body as { id?: string; markAllRead?: boolean };
  const userId = (session.user as { id: string }).id;

  await connectDB();

  if (markAllRead) {
    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return NextResponse.json({ success: true });
  }

  if (!id || !isValidObjectId(id)) {
    return NextResponse.json({ error: "Thiếu hoặc sai id thông báo." }, { status: 400 });
  }

  await Notification.updateOne({ _id: id, userId }, { $set: { isRead: true } });
  return NextResponse.json({ success: true });
}

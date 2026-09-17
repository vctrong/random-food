import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { createNotification } from "@/lib/notify";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (!isPasswordValid(newPassword)) {
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  const user = await User.findById(userId);

  if (!user || user.authProvider !== "local" || !user.passwordHash) {
    return NextResponse.json(
      { error: "Tài khoản đăng nhập bằng Google không thể đổi mật khẩu tại đây." },
      { status: 400 },
    );
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  // Đổi mật khẩu thì thu hồi (revoke) mọi session đang mở ở thiết bị khác —
  // callbacks.session() trong lib/auth.ts sẽ so sessionVersion mỗi request.
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();

  await createNotification({
    userId,
    type: "password_changed",
    message: "Mật khẩu tài khoản của bạn vừa được thay đổi.",
  });

  return NextResponse.json({ success: true });
}

/** Thu hồi (revoke) mọi session đang hoạt động — nút "Đăng xuất khỏi mọi thiết bị". */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;
  await User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  // Soft-delete theo BR-S08 (ưu tiên soft-delete) — khoá tài khoản thay vì xoá cứng dữ liệu.
  await connectDB();
  const userId = (session.user as { id: string }).id;
  await User.updateOne(
    { _id: userId },
    { $set: { accountStatus: "banned" }, $inc: { sessionVersion: 1 } },
  );

  return NextResponse.json({ success: true });
}

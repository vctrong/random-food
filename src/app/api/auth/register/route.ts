import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { cloudinary } from "@/lib/cloudinary";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const avatar = formData.get("avatar");

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name ||
    !email ||
    !password
  ) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (!isPasswordValid(password)) {
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  await connectDB();

  // Form đã kiểm tra ở bước 1 (/api/auth/check-email) — kiểm tra lại ở đây cho trường hợp
  // email vừa bị đăng ký giữa chừng. Tài khoản chỉ có Google → client chuyển sang luồng thêm mật khẩu.
  const emailCheck = await getEmailVerificationService().checkEmail(email);
  if (emailCheck.kind === "invalidEmail") {
    return NextResponse.json({ error: "Email không hợp lệ.", code: "INVALID_EMAIL" }, { status: 400 });
  }
  if (emailCheck.kind === "googleOnly") {
    return NextResponse.json(
      { error: "Email này đã được liên kết với tài khoản Google.", code: "GOOGLE_ACCOUNT" },
      { status: 409 },
    );
  }
  if (emailCheck.kind === "taken") {
    return NextResponse.json({ error: "Email đã được sử dụng.", code: "EMAIL_TAKEN" }, { status: 409 });
  }

  let avatarUrl: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const arrayBuffer = await avatar.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${avatar.type};base64,${base64}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "nayangi/avatars",
    });
    avatarUrl = uploadResult.secure_url;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      ...(avatarUrl && { avatarUrl }),
    });
  } catch (error) {
    // 2 request cùng email lọt qua bước kiểm tra phía trên — unique index trên email chặn cái sau.
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Email đã được sử dụng.", code: "EMAIL_TAKEN" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

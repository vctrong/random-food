import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { cloudinary } from "@/lib/cloudinary";

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

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email đã được sử dụng." }, { status: 409 });
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
  await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    ...(avatarUrl && { avatarUrl }),
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

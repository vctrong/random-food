import type { NextRequest } from "next/server";
import { handleRequestOtp } from "@/lib/passwordResetHttp";

/** Bước 1 Quên mật khẩu: nhận email, tạo & gửi OTP. Phản hồi luôn chung chung (chống dò email). */
export async function POST(request: NextRequest) {
  return handleRequestOtp(request, "initial");
}

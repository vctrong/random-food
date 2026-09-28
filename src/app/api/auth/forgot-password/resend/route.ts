import type { NextRequest } from "next/server";
import { handleRequestOtp } from "@/lib/passwordResetHttp";

/** Gửi lại OTP — cooldown 60s, tối đa 5 lần/giờ/email (PASSWORD_RESET_CONFIG). */
export async function POST(request: NextRequest) {
  return handleRequestOtp(request, "resend");
}

import type { NextRequest } from "next/server";
import { getPasswordResetService } from "@/lib/passwordResetStore";
import {
  enforceIpLimit,
  getRequestContext,
  readJsonBody,
  serverErrorResponse,
  stringField,
  verifyOtpResponse,
} from "@/lib/passwordResetHttp";

/** Bước 2: xác thực OTP → cấp reset token ngắn hạn trong cookie httpOnly. */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceIpLimit("verifyOtp", context);
  if (limited) return limited;

  const body = await readJsonBody(request);
  try {
    const result = await getPasswordResetService().verifyOtp(stringField(body, "email"), stringField(body, "otp"), context);
    return verifyOtpResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

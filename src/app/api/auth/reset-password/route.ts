import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPasswordResetService } from "@/lib/passwordResetStore";
import {
  clearResetCookie,
  enforceIpLimit,
  getRequestContext,
  readJsonBody,
  readResetCookie,
  resetPasswordResponse,
  serverErrorResponse,
  stringField,
} from "@/lib/passwordResetHttp";

/** Trạng thái phiên bước 3 — để reload/mở lại tab vẫn tiếp tục được khi reset token còn hạn. */
export async function GET(request: NextRequest) {
  try {
    const session = await getPasswordResetService().getResetSession(readResetCookie(request));
    if (!session) return clearResetCookie(NextResponse.json({ active: false }));
    return NextResponse.json({ active: true, ...session, serverTime: Date.now() });
  } catch {
    return serverErrorResponse();
  }
}

/** Bước 3: đặt mật khẩu mới bằng reset token (cookie httpOnly, dùng 1 lần). */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceIpLimit("resetPassword", context);
  if (limited) return limited;

  const body = await readJsonBody(request);
  try {
    const result = await getPasswordResetService().resetPassword(
      {
        token: readResetCookie(request),
        password: stringField(body, "password"),
        confirmPassword: stringField(body, "confirmPassword"),
      },
      context,
    );
    return resetPasswordResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

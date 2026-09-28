import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { enforceAccountLinkIpLimit, readPasswordLinkCookie, startPasswordLinkResponse } from "@/lib/emailVerificationHttp";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** Đăng ký bằng email của tài khoản chỉ có Google: lưu tạm hash mật khẩu + gửi OTP. Chưa gán gì vào tài khoản. */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceAccountLinkIpLimit("start", context);
  if (limited) return limited;
  const body = await readJsonBody(request);
  try {
    const result = await getEmailVerificationService().startPasswordLink(
      { email: stringField(body, "email"), password: stringField(body, "password"), flowToken: readPasswordLinkCookie(request) },
      context,
    );
    return startPasswordLinkResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

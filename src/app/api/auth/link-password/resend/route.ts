import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { enforceAccountLinkIpLimit, readPasswordLinkCookie, resendPasswordLinkResponse } from "@/lib/emailVerificationHttp";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** Gửi lại mã cho phiên thêm mật khẩu của CHÍNH trình duyệt này (cookie), giữ nguyên mật khẩu chờ gán. */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceAccountLinkIpLimit("start", context);
  if (limited) return limited;
  const body = await readJsonBody(request);
  try {
    const result = await getEmailVerificationService().resendPasswordLinkCode(
      { email: stringField(body, "email"), flowToken: readPasswordLinkCookie(request) },
      context,
    );
    return resendPasswordLinkResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

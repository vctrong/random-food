import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { checkEmailResponse, enforceAccountLinkIpLimit } from "@/lib/emailVerificationHttp";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** Form Đăng ký: email chưa có / đã có tài khoản có mật khẩu / chỉ có Google. POST để email không nằm trên URL. */
export async function POST(request: NextRequest) {
  const limited = await enforceAccountLinkIpLimit("checkEmail", getRequestContext(request));
  if (limited) return limited;
  const body = await readJsonBody(request);
  try {
    return checkEmailResponse(await getEmailVerificationService().checkEmail(stringField(body, "email")));
  } catch {
    return serverErrorResponse();
  }
}

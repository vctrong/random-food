import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { confirmPasswordLinkResponse, enforceAccountLinkIpLimit, readPasswordLinkCookie } from "@/lib/emailVerificationHttp";
import { notify } from "@/lib/notifications/notify";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** OTP đúng → gán mật khẩu đã lưu tạm vào tài khoản CŨ + đánh dấu email đã xác thực. */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceAccountLinkIpLimit("confirm", context);
  if (limited) return limited;
  const body = await readJsonBody(request);
  try {
    const result = await getEmailVerificationService().confirmPasswordLink(
      { email: stringField(body, "email"), otp: stringField(body, "otp"), flowToken: readPasswordLinkCookie(request) },
      context,
    );
    if (result.kind === "linked") {
      await notify(result.userId, { type: "password_changed", payload: { method: "link" } });
    }
    return confirmPasswordLinkResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

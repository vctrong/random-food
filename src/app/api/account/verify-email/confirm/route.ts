import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { authorizeVerificationRequest, confirmCodeResponse } from "@/lib/emailVerificationHttp";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** Xác nhận mã → bật users.isVerified. Sai 5 lần thì mã bị huỷ (không khoá tài khoản). */
export async function POST(request: NextRequest) {
  const authorized = await authorizeVerificationRequest("confirm");
  if ("response" in authorized) return authorized.response;
  const body = await readJsonBody(request);
  try {
    const result = await getEmailVerificationService().confirmCode(
      authorized.userId,
      stringField(body, "otp"),
      getRequestContext(request),
    );
    return confirmCodeResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

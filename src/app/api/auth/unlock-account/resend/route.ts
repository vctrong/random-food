import type { NextRequest } from "next/server";
import { getPasswordResetService } from "@/lib/passwordResetStore";
import {
  enforceIpLimit,
  getRequestContext,
  readJsonBody,
  resendUnlockResponse,
  serverErrorResponse,
  stringField,
} from "@/lib/passwordResetHttp";

/** Gửi lại email mở khoá — theo `email` hoặc theo `token` cũ đã hết hạn. */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceIpLimit("resendUnlock", context);
  if (limited) return limited;

  const body = await readJsonBody(request);
  try {
    const result = await getPasswordResetService().resendUnlockEmail(
      { email: stringField(body, "email") || undefined, token: stringField(body, "token") || undefined },
      context,
    );
    return resendUnlockResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

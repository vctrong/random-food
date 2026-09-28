import type { NextRequest } from "next/server";
import { getPasswordResetService } from "@/lib/passwordResetStore";
import {
  enforceIpLimit,
  getRequestContext,
  readJsonBody,
  serverErrorResponse,
  stringField,
  unlockResponse,
} from "@/lib/passwordResetHttp";

/**
 * Mở khoá bằng token trong email. Chỉ nhận POST (trang /mo-khoa-tai-khoan tự gọi)
 * — trình quét link của hộp thư chỉ GET nên không vô tình tiêu mất token dùng 1 lần.
 */
export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const limited = await enforceIpLimit("unlock", context);
  if (limited) return limited;

  const body = await readJsonBody(request);
  try {
    return unlockResponse(await getPasswordResetService().unlockAccount(stringField(body, "token"), context));
  } catch {
    return serverErrorResponse();
  }
}

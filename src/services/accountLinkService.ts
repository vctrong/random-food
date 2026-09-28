import { callJson, toLocalClock, type ApiResult } from "@/services/apiClient";
import type { OtpState } from "@/services/passwordResetService";

/**
 * Gọi API của form Đăng ký (khách): kiểm tra email + thêm mật khẩu cho tài khoản
 * chỉ có Google — chỉ dùng phía client. Mốc thời gian đổi sang đồng hồ máy người dùng.
 */

export type RegisterEmailStatus = "available" | "taken" | "google_only";

export function checkRegisterEmail(email: string) {
  return callJson<{ status: RegisterEmailStatus; message?: string }>("/api/auth/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function requestCode(url: string, body: Record<string, string>): Promise<ApiResult<{ state: OtpState }>> {
  const result = await callJson<{ state: OtpState; serverTime: number }>(url, { method: "POST", body: JSON.stringify(body) });
  if (!result.ok) return result;
  const local = toLocalClock(result.data.serverTime);
  const { state } = result.data;
  return { ok: true, data: { state: { ...state, otpExpiresAt: local(state.otpExpiresAt), resendAvailableAt: local(state.resendAvailableAt) } } };
}

export function startPasswordLink(email: string, password: string) {
  return requestCode("/api/auth/link-password", { email, password });
}

export function resendPasswordLinkCode(email: string) {
  return requestCode("/api/auth/link-password/resend", { email });
}

export function confirmPasswordLink(email: string, otp: string) {
  return callJson<{ ok: true }>("/api/auth/link-password/confirm", { method: "POST", body: JSON.stringify({ email, otp }) });
}

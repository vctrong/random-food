import { callJson, toLocalClock, type ApiResult } from "@/services/apiClient";
import type { OtpState } from "@/services/passwordResetService";

/** Gọi API xác thực email (trang Hồ sơ) — chỉ dùng phía client. */

function toLocalState(state: OtpState, serverTime: unknown): OtpState {
  const local = toLocalClock(serverTime);
  return { ...state, otpExpiresAt: local(state.otpExpiresAt), resendAvailableAt: local(state.resendAvailableAt) };
}

export async function sendEmailVerificationCode(): Promise<ApiResult<{ state: OtpState }>> {
  const result = await callJson<{ state: OtpState; serverTime: number }>("/api/account/verify-email", { method: "POST", body: "{}" });
  if (!result.ok) return result;
  return { ok: true, data: { state: toLocalState(result.data.state, result.data.serverTime) } };
}

export function confirmEmailVerificationCode(otp: string) {
  return callJson<{ ok: true }>("/api/account/verify-email/confirm", { method: "POST", body: JSON.stringify({ otp }) });
}

/** Đổi `pending` do server component trả về (giờ server) sang giờ máy người dùng. */
export function toClientOtpState(state: OtpState, serverTime: number): OtpState {
  return toLocalState(state, serverTime);
}

/** Tạo mật khẩu đầu tiên sau khi xác thực email (tài khoản Google chưa có mật khẩu). */
export function createInitialPassword(password: string, confirmPassword: string) {
  return callJson<{ ok: true }>("/api/account/set-password", {
    method: "POST",
    body: JSON.stringify({ password, confirmPassword }),
  });
}

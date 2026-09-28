import { callJson, toLocalClock, type ApiResult } from "@/services/apiClient";

export type { ApiFailure, ApiResult } from "@/services/apiClient";

/**
 * Lớp gọi API Quên mật khẩu / mở khoá cho client ("use client" hook/component).
 * Mọi mốc thời gian server trả về được đổi sang đồng hồ của máy người dùng
 * (bù lệch qua `serverTime`) để đồng hồ đếm ngược không chạy sai khi máy lệch giờ.
 */

export interface OtpState {
  maskedEmail: string;
  otpExpiresAt: number;
  resendAvailableAt: number;
  sendsRemaining: number;
  attemptsLeft: number;
}

interface OtpResponse {
  resent: boolean;
  state: OtpState;
  serverTime: number;
}

async function requestOtpAt(url: string, email: string): Promise<ApiResult<{ resent: boolean; state: OtpState }>> {
  const result = await callJson<OtpResponse>(url, { method: "POST", body: JSON.stringify({ email }) });
  if (!result.ok) return result;
  const local = toLocalClock(result.data.serverTime);
  const { state } = result.data;
  return {
    ok: true,
    data: {
      resent: result.data.resent,
      state: { ...state, otpExpiresAt: local(state.otpExpiresAt), resendAvailableAt: local(state.resendAvailableAt) },
    },
  };
}

export function requestPasswordResetOtp(email: string) {
  return requestOtpAt("/api/auth/forgot-password", email);
}

export function resendPasswordResetOtp(email: string) {
  return requestOtpAt("/api/auth/forgot-password/resend", email);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<ApiResult<{ resetExpiresAt: number }>> {
  const result = await callJson<{ resetExpiresAt: number; serverTime: number }>("/api/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  if (!result.ok) return result;
  return { ok: true, data: { resetExpiresAt: toLocalClock(result.data.serverTime)(result.data.resetExpiresAt) } };
}

export type ResetSession = { active: false } | { active: true; maskedEmail: string; expiresAt: number };

export async function getPasswordResetSession(): Promise<ApiResult<ResetSession>> {
  const result = await callJson<{ active: boolean; maskedEmail?: string; expiresAt?: number; serverTime?: number }>(
    "/api/auth/reset-password",
    { method: "GET" },
  );
  if (!result.ok) return result;
  const { active, maskedEmail, expiresAt, serverTime } = result.data;
  if (!active || !maskedEmail || typeof expiresAt !== "number") return { ok: true, data: { active: false } };
  return { ok: true, data: { active: true, maskedEmail, expiresAt: toLocalClock(serverTime)(expiresAt) } };
}

export function submitNewPassword(password: string, confirmPassword: string) {
  return callJson<{ ok: true }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ password, confirmPassword }),
  });
}

export function unlockAccount(token: string) {
  return callJson<{ ok: true }>("/api/auth/unlock-account", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendUnlockEmail(target: { email: string } | { token: string }) {
  return callJson<{ ok: true; message: string }>("/api/auth/unlock-account/resend", {
    method: "POST",
    body: JSON.stringify(target),
  });
}

"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { confirmPasswordLink, resendPasswordLinkCode, startPasswordLink } from "@/services/accountLinkService";
import type { ApiFailure } from "@/services/apiClient";
import type { OtpState } from "@/services/passwordResetService";

const NETWORK_CODES = new Set(["NETWORK", "TIMEOUT"]);
/** Mã không còn dùng được — khoá ô nhập, chỉ còn nút gửi mã mới. */
const DEAD_CODE_ERRORS = new Set(["OTP_TOO_MANY_ATTEMPTS", "OTP_EXPIRED", "OTP_INVALIDATED"]);

export type StartOutcome = "sent" | "available" | "taken" | "failed";
export type ConfirmOutcome = { kind: "linked" } | { kind: "sessionEnded"; message: string } | { kind: "failed" };

/**
 * State màn "Email đã liên kết với Google — nhập mã để thêm mật khẩu" trong form
 * Đăng ký. Server tự kiểm tra lại mọi thứ; hook chỉ giữ trạng thái hiển thị.
 */
export function usePasswordLinkFlow() {
  const { showToast } = useToast();
  const [otpState, setOtpState] = useState<OtpState | null>(null);
  const [pending, setPending] = useState<"start" | "resend" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const reportFailure = useCallback(
    (result: ApiFailure) => {
      setError(result.message);
      if (result.retryAfterMs && (result.code === "RESEND_COOLDOWN" || result.code === "RESEND_LIMIT")) {
        const availableAt = Date.now() + result.retryAfterMs;
        setOtpState((prev) =>
          prev ? { ...prev, resendAvailableAt: availableAt, sendsRemaining: result.code === "RESEND_LIMIT" ? 0 : prev.sendsRemaining } : prev,
        );
      }
      if (NETWORK_CODES.has(result.code) || result.status >= 500) showToast(result.message, "error");
    },
    [showToast],
  );

  const onCodeSent = useCallback(
    (state: OtpState) => {
      setOtpState(state);
      setInputKey((key) => key + 1);
      showToast(`Đã gửi mã xác thực tới ${state.maskedEmail}.`, "success", { description: "Kiểm tra cả thư mục Spam nếu chưa thấy." });
    },
    [showToast],
  );

  const start = useCallback(
    async (email: string, password: string): Promise<StartOutcome> => {
      setPending("start");
      setError(null);
      const result = await startPasswordLink(email, password);
      setPending(null);
      if (result.ok) {
        onCodeSent(result.data.state);
        return "sent";
      }
      if (result.code === "NO_GOOGLE_ACCOUNT") return "available";
      if (result.code === "EMAIL_TAKEN") return "taken";
      reportFailure(result);
      return "failed";
    },
    [onCodeSent, reportFailure],
  );

  const resend = useCallback(
    async (email: string) => {
      setPending("resend");
      setError(null);
      const result = await resendPasswordLinkCode(email);
      setPending(null);
      if (result.ok) {
        onCodeSent(result.data.state);
        return;
      }
      reportFailure(result);
    },
    [onCodeSent, reportFailure],
  );

  const confirm = useCallback(
    async (email: string, code: string): Promise<ConfirmOutcome> => {
      if (pending === "confirm") return { kind: "failed" };
      setPending("confirm");
      setError(null);
      const result = await confirmPasswordLink(email, code);
      setPending(null);
      if (result.ok) return { kind: "linked" };
      setInputKey((key) => key + 1);
      if (result.code === "OTP_INCORRECT" && result.attemptsLeft !== undefined) {
        setOtpState((prev) => (prev ? { ...prev, attemptsLeft: result.attemptsLeft ?? prev.attemptsLeft } : prev));
      } else if (DEAD_CODE_ERRORS.has(result.code)) {
        setOtpState((prev) => (prev ? { ...prev, otpExpiresAt: Math.min(prev.otpExpiresAt, Date.now()) } : prev));
      }
      reportFailure(result);
      // Phiên không còn (cookie hết hạn / tài khoản vừa có mật khẩu / bị khoá) — form quay về bước đầu.
      return ["LINK_SESSION_INVALID", "ALREADY_HAS_PASSWORD", "ACCOUNT_UNAVAILABLE"].includes(result.code)
        ? { kind: "sessionEnded", message: result.message }
        : { kind: "failed" };
    },
    [pending, reportFailure],
  );

  const reset = useCallback(() => {
    setOtpState(null);
    setError(null);
    setPending(null);
  }, []);

  return { otpState, pending, error, inputKey, start, resend, confirm, reset };
}

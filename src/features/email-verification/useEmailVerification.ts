"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import {
  confirmEmailVerificationCode,
  sendEmailVerificationCode,
  toClientOtpState,
} from "@/services/emailVerificationService";
import type { OtpState } from "@/services/passwordResetService";

interface UseEmailVerificationInput {
  initialIsVerified: boolean;
  /** Mã đang còn hạn lúc server render (giờ server) + mốc giờ server để bù lệch. */
  initialPending: OtpState | null;
  serverTime: number;
}

const NETWORK_CODES = new Set(["NETWORK", "TIMEOUT"]);

/**
 * State xác thực email trong trang Hồ sơ (BR-S15). Mã bị huỷ/hết hạn thì đưa
 * đồng hồ về 0 để UI chuyển sang trạng thái "gửi mã mới". Xác thực xong thì
 * router.refresh() để các phần server-render (badge email) cập nhật theo.
 */
export function useEmailVerification({ initialIsVerified, initialPending, serverTime }: UseEmailVerificationInput) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [justVerified, setJustVerified] = useState(false);
  const [otpState, setOtpState] = useState<OtpState | null>(() =>
    initialPending ? toClientOtpState(initialPending, serverTime) : null,
  );
  const [pending, setPending] = useState<"send" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const markVerified = useCallback(() => {
    setIsVerified(true);
    setJustVerified(true);
    setOtpState(null);
    setError(null);
    router.refresh();
  }, [router]);

  const sendCode = useCallback(async () => {
    setPending("send");
    setError(null);
    const result = await sendEmailVerificationCode();
    setPending(null);
    if (result.ok) {
      setOtpState(result.data.state);
      setInputKey((key) => key + 1);
      showToast(`Đã gửi mã xác thực tới ${result.data.state.maskedEmail}.`, "success", {
        description: "Kiểm tra cả thư mục Spam nếu chưa thấy.",
      });
      return;
    }
    if (result.code === "ALREADY_VERIFIED") {
      markVerified();
      return;
    }
    if (result.retryAfterMs && (result.code === "RESEND_COOLDOWN" || result.code === "RESEND_LIMIT")) {
      const availableAt = Date.now() + result.retryAfterMs;
      setOtpState((prev) => (prev ? { ...prev, resendAvailableAt: availableAt, sendsRemaining: result.code === "RESEND_LIMIT" ? 0 : prev.sendsRemaining } : prev));
    }
    setError(result.message);
    if (NETWORK_CODES.has(result.code) || result.status >= 500) showToast(result.message, "error");
  }, [markVerified, showToast]);

  const confirmCode = useCallback(
    async (code: string) => {
      if (pending === "confirm") return;
      setPending("confirm");
      setError(null);
      const result = await confirmEmailVerificationCode(code);
      setPending(null);
      if (result.ok || (!result.ok && result.code === "ALREADY_VERIFIED")) {
        markVerified();
        showToast("Xác thực email thành công!", "success", { description: "Bạn đã có thể dùng “Quên mật khẩu” khi cần." });
        return;
      }
      setError(result.message);
      setInputKey((key) => key + 1);
      setOtpState((prev) => {
        if (!prev) return prev;
        if (result.code === "OTP_INCORRECT" && result.attemptsLeft !== undefined) return { ...prev, attemptsLeft: result.attemptsLeft };
        // Mã bị huỷ / hết hạn / không còn hiệu lực → khoá ô nhập, chỉ còn nút gửi mã mới.
        if (["OTP_TOO_MANY_ATTEMPTS", "OTP_EXPIRED", "OTP_INVALIDATED"].includes(result.code)) {
          return { ...prev, otpExpiresAt: Math.min(prev.otpExpiresAt, Date.now()) };
        }
        return prev;
      });
      if (NETWORK_CODES.has(result.code) || result.status >= 500) showToast(result.message, "error");
    },
    [markVerified, pending, showToast],
  );

  return { isVerified, justVerified, otpState, pending, error, inputKey, sendCode, confirmCode };
}

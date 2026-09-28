"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { PASSWORD_RESET_CONFIG, PASSWORD_RESET_STORAGE_KEY } from "@/constants/passwordReset";
import { isValidEmail, maskEmail, normalizeEmail } from "@/features/password-reset/passwordResetLogic";
import {
  getPasswordResetSession,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  resendUnlockEmail,
  submitNewPassword,
  verifyPasswordResetOtp,
  type ApiFailure,
  type OtpState,
} from "@/services/passwordResetService";

export type FlowStep = "email" | "otp" | "password" | "success";
type Pending = "request" | "resend" | "verify" | "reset" | "unlock" | null;

const BASE_PATH = "/quen-mat-khau";
const STEP_PARAM = "buoc";
const URL_TO_STEP: Record<string, FlowStep> = { "xac-thuc": "otp", "mat-khau-moi": "password", "hoan-tat": "success" };
const STEP_TO_URL: Record<FlowStep, string | null> = { email: null, otp: "xac-thuc", password: "mat-khau-moi", success: "hoan-tat" };

const stepHref = (step: FlowStep) => (STEP_TO_URL[step] ? `${BASE_PATH}?${STEP_PARAM}=${STEP_TO_URL[step]}` : BASE_PATH);

/** sessionStorage chỉ giữ email + mốc thời gian (không nhạy cảm) để reload ở bước 2 không phải làm lại. */
interface StoredFlow {
  email: string;
  otp: OtpState | null;
}

function readStored(): StoredFlow | null {
  try {
    const raw = window.sessionStorage.getItem(PASSWORD_RESET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFlow>;
    return typeof parsed.email === "string" ? { email: parsed.email, otp: parsed.otp ?? null } : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredFlow) {
  try {
    window.sessionStorage.setItem(PASSWORD_RESET_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Không lưu được (chế độ riêng tư...) thì reload sẽ phải nhập lại email — chấp nhận được.
  }
}

function clearStored() {
  try {
    window.sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
  } catch {
    // bỏ qua
  }
}

export interface LockedInfo {
  email: string;
  maskedEmail: string;
}

/**
 * Điều phối luồng Quên mật khẩu 3 bước. URL (?buoc=) là nguồn sự thật của bước
 * để nút Back/Forward hoạt động; mỗi lần URL đổi đều kiểm tra lại điều kiện
 * (có email/OTP chưa, reset token còn hạn không) — vào thẳng URL bước 2/3 khi
 * chưa đủ điều kiện sẽ bị đưa về bước 1. Bước 1→2 dùng push (Back về sửa email),
 * 2→3 và 3→hoàn tất dùng replace (không Back lại được vào mã OTP đã dùng).
 */
export function usePasswordResetFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const urlStep: FlowStep = URL_TO_STEP[searchParams.get(STEP_PARAM) ?? ""] ?? "email";

  const [step, setStep] = useState<FlowStep | null>(null);
  const [email, setEmail] = useState("");
  const [otpState, setOtpState] = useState<OtpState | null>(null);
  const [resetSession, setResetSession] = useState<{ maskedEmail: string; expiresAt: number } | null>(null);
  const [locked, setLocked] = useState<LockedInfo | null>(null);
  const [unlockCooldownUntil, setUnlockCooldownUntil] = useState(0);
  const [pending, setPending] = useState<Pending>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  /** Mã lỗi server của bước 1 (ACCOUNT_NOT_FOUND, GOOGLE_ACCOUNT…) — để hiện gợi ý đúng tình huống. */
  const [emailErrorCode, setEmailErrorCode] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  /** Tăng lên để xoá các ô OTP (sau khi nhập sai / gửi mã mới). */
  const [otpInputKey, setOtpInputKey] = useState(0);

  const isFirstSync = useRef(true);
  const completed = useRef(false);
  const resetSessionRef = useRef(resetSession);

  // Khai báo TRƯỚC effect đồng bộ URL để ref luôn mới khi effect đó chạy cùng lượt commit.
  useEffect(() => {
    resetSessionRef.current = resetSession;
  }, [resetSession]);

  const goTo = useCallback(
    (target: FlowStep, mode: "push" | "replace") => {
      const href = stepHref(target);
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const stored = readStored();
      if (stored?.email) setEmail((prev) => prev || stored.email);
      const firstSync = isFirstSync.current;
      isFirstSync.current = false;

      if (urlStep === "otp") {
        if (stored?.otp) {
          setOtpState(stored.otp);
          setStep("otp");
        } else {
          goTo("email", "replace");
        }
        return;
      }

      if (urlStep === "password") {
        const known = resetSessionRef.current;
        if (known && known.expiresAt > Date.now()) {
          setStep("password");
          return;
        }
        const result = await getPasswordResetSession();
        if (cancelled) return;
        if (result.ok && result.data.active) {
          setResetSession({ maskedEmail: result.data.maskedEmail, expiresAt: result.data.expiresAt });
          setStep("password");
          return;
        }
        showToast(
          result.ok ? "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng bắt đầu lại." : result.message,
          result.ok ? "warning" : "error",
        );
        clearStored();
        setResetSession(null);
        goTo("email", "replace");
        return;
      }

      if (urlStep === "success") {
        if (completed.current) setStep("success");
        else goTo("email", "replace");
        return;
      }

      // Bước 1. Lần tải trang đầu: nếu vẫn còn phiên bước 3 hợp lệ (đóng tab/reload
      // ở bước 3 rồi quay lại trong hạn) thì đưa thẳng tới bước 3.
      if (firstSync) {
        const result = await getPasswordResetSession();
        if (cancelled) return;
        if (result.ok && result.data.active) {
          setResetSession({ maskedEmail: result.data.maskedEmail, expiresAt: result.data.expiresAt });
          goTo("password", "replace");
          return;
        }
      }
      setStep("email");
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [urlStep, goTo, showToast]);

  const enterLocked = useCallback(
    (targetEmail: string) => {
      setLocked({ email: targetEmail, maskedEmail: maskEmail(targetEmail) });
      setOtpState(null);
      writeStored({ email: targetEmail, otp: null });
      if (urlStep !== "email") goTo("email", "replace");
    },
    [goTo, urlStep],
  );

  const handleRequestFailure = useCallback(
    (failure: ApiFailure, targetEmail: string, setError: (message: string | null) => void) => {
      if (failure.code === "ACCOUNT_LOCKED") {
        enterLocked(targetEmail);
        return;
      }
      setError(failure.message);
      if (failure.code === "NETWORK" || failure.code === "TIMEOUT" || failure.code === "EMAIL_FAILED" || failure.status >= 500) {
        showToast(failure.message, "error");
      }
    },
    [enterLocked, showToast],
  );

  const submitEmail = useCallback(
    async (rawEmail: string) => {
      const normalized = normalizeEmail(rawEmail);
      if (!isValidEmail(normalized)) {
        setEmailError("Email không hợp lệ. Ví dụ: tenban@email.com");
        return;
      }
      setEmailError(null);
      setEmailErrorCode(null);
      setLocked(null);
      setPending("request");
      const result = await requestPasswordResetOtp(normalized);
      setPending(null);
      if (!result.ok) {
        setEmailErrorCode(result.code);
        handleRequestFailure(result, normalized, setEmailError);
        return;
      }
      setEmail(normalized);
      setOtpState(result.data.state);
      setOtpError(null);
      setOtpInputKey((key) => key + 1);
      writeStored({ email: normalized, otp: result.data.state });
      if (!result.data.resent) showToast("Mã vừa được gửi trước đó vẫn còn hiệu lực — hãy kiểm tra hộp thư.", "info");
      goTo("otp", "push");
    },
    [goTo, handleRequestFailure, showToast],
  );

  const resendOtp = useCallback(async () => {
    if (!email) return;
    setPending("resend");
    const result = await resendPasswordResetOtp(email);
    setPending(null);
    if (result.ok) {
      setOtpState(result.data.state);
      writeStored({ email, otp: result.data.state });
      setOtpError(null);
      setOtpInputKey((key) => key + 1);
      showToast(`Đã gửi mã mới tới ${result.data.state.maskedEmail}.`, "success", {
        description: "Mã cũ không còn dùng được nữa.",
      });
      return;
    }
    if ((result.code === "RESEND_COOLDOWN" || result.code === "RESEND_LIMIT") && result.retryAfterMs) {
      const availableAt = Date.now() + result.retryAfterMs;
      setOtpState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, resendAvailableAt: availableAt, sendsRemaining: result.code === "RESEND_LIMIT" ? 0 : prev.sendsRemaining };
        writeStored({ email, otp: next });
        return next;
      });
    }
    handleRequestFailure(result, email, setOtpError);
  }, [email, handleRequestFailure, showToast]);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (!email || pending === "verify") return;
      setPending("verify");
      setOtpError(null);
      const result = await verifyPasswordResetOtp(email, code);
      setPending(null);
      if (result.ok) {
        setResetSession({ maskedEmail: otpState?.maskedEmail ?? maskEmail(email), expiresAt: result.data.resetExpiresAt });
        writeStored({ email, otp: null });
        goTo("password", "replace");
        return;
      }
      if (result.code === "ACCOUNT_LOCKED") {
        enterLocked(email);
        return;
      }
      setOtpError(result.message);
      setOtpInputKey((key) => key + 1);
      setOtpState((prev) => {
        if (!prev) return prev;
        const next =
          result.code === "OTP_INCORRECT" && result.attemptsLeft !== undefined
            ? { ...prev, attemptsLeft: result.attemptsLeft }
            : result.code === "OTP_EXPIRED"
              ? { ...prev, otpExpiresAt: Math.min(prev.otpExpiresAt, Date.now()) }
              : prev;
        writeStored({ email, otp: next });
        return next;
      });
      if (result.code === "NETWORK" || result.code === "TIMEOUT" || result.status >= 500) showToast(result.message, "error");
    },
    [email, enterLocked, goTo, otpState?.maskedEmail, pending, showToast],
  );

  const changeEmail = useCallback(() => {
    clearStored();
    setOtpState(null);
    setOtpError(null);
    setLocked(null);
    goTo("email", "replace");
  }, [goTo]);

  const submitPassword = useCallback(
    async (password: string, confirmPassword: string) => {
      setPending("reset");
      setPasswordError(null);
      const result = await submitNewPassword(password, confirmPassword);
      setPending(null);
      if (result.ok) {
        clearStored();
        completed.current = true;
        setResetSession(null);
        setStep("success");
        goTo("success", "replace");
        showToast("Đặt lại mật khẩu thành công!", "success", { description: "Các thiết bị khác đã được đăng xuất." });
        return;
      }
      if (result.code === "RESET_SESSION_EXPIRED") {
        showToast(result.message, "warning");
        clearStored();
        setResetSession(null);
        goTo("email", "replace");
        return;
      }
      setPasswordError(result.message);
      if (result.code === "NETWORK" || result.code === "TIMEOUT" || result.status >= 500) showToast(result.message, "error");
    },
    [goTo, showToast],
  );

  /** Bỏ phiên bước 3 hiện tại, làm lại từ đầu (gửi OTP mới sẽ vô hiệu reset token cũ). */
  const restart = useCallback(() => {
    clearStored();
    setResetSession(null);
    setOtpState(null);
    goTo("email", "replace");
  }, [goTo]);

  const resendUnlock = useCallback(async () => {
    if (!locked) return;
    setPending("unlock");
    const result = await resendUnlockEmail({ email: locked.email });
    setPending(null);
    if (result.ok) {
      setUnlockCooldownUntil(Date.now() + PASSWORD_RESET_CONFIG.unlockEmailCooldownMs);
      showToast("Đã gửi lại email mở khoá.", "success", { description: `Kiểm tra hộp thư ${locked.maskedEmail} (cả mục Spam).` });
      return;
    }
    if (result.retryAfterMs) setUnlockCooldownUntil(Date.now() + result.retryAfterMs);
    showToast(result.message, result.status === 429 ? "warning" : "error");
  }, [locked, showToast]);

  const clearEmailError = useCallback(() => {
    setEmailError(null);
    setEmailErrorCode(null);
  }, []);

  const dismissLocked = useCallback(() => {
    setLocked(null);
    clearStored();
  }, []);

  return {
    step,
    email,
    otpState,
    resetSession,
    locked,
    unlockCooldownUntil,
    pending,
    emailError,
    emailErrorCode,
    otpError,
    passwordError,
    otpInputKey,
    clearEmailError,
    setPasswordError,
    submitEmail,
    resendOtp,
    verifyOtp,
    changeEmail,
    submitPassword,
    restart,
    resendUnlock,
    dismissLocked,
  };
}

export type PasswordResetFlow = ReturnType<typeof usePasswordResetFlow>;

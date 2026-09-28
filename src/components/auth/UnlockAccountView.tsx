"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, KeyRound, LinkIcon, LockOpen, LogIn, RotateCw, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { AuthCard, AuthCardHeader } from "@/components/auth/AuthCard";
import { useToast } from "@/components/ui/ToastProvider";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import { formatCountdown } from "@/features/password-reset/passwordResetLogic";
import { useNow } from "@/features/password-reset/useNow";
import { resendUnlockEmail, unlockAccount } from "@/services/passwordResetService";

type UnlockStatus = "processing" | "success" | "expired" | "invalid" | "error";

/**
 * Trang đích của link "Mở khoá tài khoản" trong email cảnh báo. Tự gửi POST khi
 * mở trang (không mở khoá bằng GET — trình quét link của hộp thư sẽ không vô tình
 * tiêu mất token dùng 1 lần). Chạy đúng 1 lần kể cả StrictMode (ref chặn gọi lặp).
 */
export function UnlockAccountView() {
  const token = useSearchParams().get("token") ?? "";
  const { showToast } = useToast();
  const [status, setStatus] = useState<UnlockStatus>(token ? "processing" : "invalid");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  const [resendDone, setResendDone] = useState(false);
  const attemptedToken = useRef<string | null>(null);
  const now = useNow(resendCooldownUntil > 0);
  const resendWaitMs = resendCooldownUntil - now;

  const runUnlock = useCallback(async () => {
    setStatus("processing");
    const result = await unlockAccount(token);
    if (result.ok) {
      setStatus("success");
      return;
    }
    if (result.code === "UNLOCK_EXPIRED") setStatus("expired");
    else if (result.code === "UNLOCK_INVALID") setStatus("invalid");
    else {
      setErrorMessage(result.message);
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    if (!token || attemptedToken.current === token) return;
    attemptedToken.current = token;
    void runUnlock();
  }, [token, runUnlock]);

  async function handleResend() {
    setIsResending(true);
    const result = await resendUnlockEmail({ token });
    setIsResending(false);
    if (result.ok) {
      setResendDone(true);
      setResendCooldownUntil(Date.now() + PASSWORD_RESET_CONFIG.unlockEmailCooldownMs);
      showToast("Đã gửi email mở khoá mới.", "success", { description: "Hãy dùng liên kết trong email mới nhất." });
      return;
    }
    if (result.retryAfterMs) setResendCooldownUntil(Date.now() + result.retryAfterMs);
    showToast(result.message, result.status === 429 ? "warning" : "error");
  }

  return (
    <AuthCard>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center text-center"
        >
          {status === "processing" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-5">
              <Spinner label="Đang mở khoá tài khoản" />
              <p className="text-sm text-text-secondary" aria-live="polite">
                Đang mở khoá tài khoản của bạn...
              </p>
            </div>
          )}

          {status === "success" && (
            <>
              <span className="mb-5 grid size-20 place-items-center rounded-full bg-success/15">
                <CheckCircle2 className="size-10 text-success" aria-hidden />
              </span>
              <AuthCardHeader
                focusOnMount
                icon={<LockOpen className="size-3.5" aria-hidden />}
                badge="Mở khoá thành công"
                title="Tài khoản đã được mở khoá"
                description="Mật khẩu của bạn không thay đổi — hãy đăng nhập bằng email và mật khẩu như trước. Nếu không nhớ mật khẩu, bạn có thể đặt lại ngay."
              />
              <div className="flex w-full flex-col gap-2.5">
                <Button href="/dang-nhap" size="lg" fullWidth leftIcon={<LogIn className="size-4" aria-hidden />}>
                  Đăng nhập
                </Button>
                <Button href="/quen-mat-khau" variant="secondary" size="lg" fullWidth leftIcon={<KeyRound className="size-4" aria-hidden />}>
                  Quên mật khẩu?
                </Button>
              </div>
            </>
          )}

          {status === "expired" && (
            <>
              <span className="mb-5 grid size-20 place-items-center rounded-full bg-warning/20">
                <Clock className="size-10 text-secondary-strong dark:text-warning" aria-hidden />
              </span>
              <AuthCardHeader
                focusOnMount
                tone="accent"
                icon={<ShieldAlert className="size-3.5" aria-hidden />}
                badge="Liên kết hết hạn"
                title="Liên kết mở khoá đã hết hạn"
                description={`Liên kết chỉ có hiệu lực trong ${PASSWORD_RESET_CONFIG.unlockTokenTtlMs / 3_600_000} giờ. Tài khoản vẫn đang tạm khoá — hãy yêu cầu email mở khoá mới.`}
              />
              <div className="flex w-full flex-col gap-2.5">
                <Button
                  type="button"
                  size="lg"
                  fullWidth
                  isLoading={isResending}
                  disabled={resendWaitMs > 0}
                  onClick={() => void handleResend()}
                  leftIcon={<RotateCw className="size-4" aria-hidden />}
                >
                  {resendWaitMs > 0 ? `Gửi lại sau ${formatCountdown(resendWaitMs)}` : resendDone ? "Gửi lại lần nữa" : "Gửi email mở khoá mới"}
                </Button>
                <Button href="/dang-nhap" variant="secondary" size="lg" fullWidth>
                  Về trang đăng nhập
                </Button>
              </div>
            </>
          )}

          {status === "invalid" && (
            <>
              <span className="mb-5 grid size-20 place-items-center rounded-full bg-accent-soft">
                <LinkIcon className="size-10 text-accent-ink" aria-hidden />
              </span>
              <AuthCardHeader
                focusOnMount
                tone="accent"
                icon={<ShieldAlert className="size-3.5" aria-hidden />}
                badge="Liên kết không hợp lệ"
                title="Không thể mở khoá bằng liên kết này"
                description="Liên kết không đúng, đã được sử dụng, đã có liên kết mới hơn, hoặc tài khoản hiện không bị khoá. Hãy thử đăng nhập; nếu tài khoản vẫn bị khoá, dùng liên kết trong email mở khoá mới nhất."
              />
              <div className="flex w-full flex-col gap-2.5">
                <Button href="/dang-nhap" size="lg" fullWidth leftIcon={<LogIn className="size-4" aria-hidden />}>
                  Về trang đăng nhập
                </Button>
                <Button href="/quen-mat-khau" variant="secondary" size="lg" fullWidth>
                  Quên mật khẩu?
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <span className="mb-5 grid size-20 place-items-center rounded-full bg-primary-soft">
                <WifiOff className="size-10 text-primary-strong dark:text-primary" aria-hidden />
              </span>
              <AuthCardHeader
                focusOnMount
                icon={<ShieldAlert className="size-3.5" aria-hidden />}
                badge="Chưa thể xử lý"
                title="Có lỗi khi mở khoá"
                description={errorMessage ?? "Đã có lỗi xảy ra, vui lòng thử lại."}
              />
              <Button type="button" size="lg" fullWidth onClick={() => void runUnlock()} leftIcon={<RotateCw className="size-4" aria-hidden />}>
                Thử lại
              </Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthCard>
  );
}

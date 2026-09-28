"use client";

import { useState } from "react";
import { CheckCircle2, Clock, KeyRound, MailCheck, MailWarning, RotateCw, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/auth/OtpInput";
import { AuthInlineError } from "@/components/auth/AuthCard";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import { EMAIL_VERIFICATION_CONFIG } from "@/constants/emailVerification";
import { formatCountdown } from "@/features/password-reset/passwordResetLogic";
import { useNow } from "@/features/password-reset/useNow";
import { useEmailVerification } from "@/features/email-verification/useEmailVerification";
import { useInitialPassword } from "@/features/email-verification/useInitialPassword";
import { CreatePasswordForm } from "./CreatePasswordForm";
import { cn } from "@/lib/utils";
import type { OtpState } from "@/services/passwordResetService";

interface EmailVerificationCardProps {
  email: string;
  isVerified: boolean;
  /** Tài khoản đã có mật khẩu chưa — tài khoản Google thì chưa, trừ khi đã thêm qua form Đăng ký. */
  hasPassword: boolean;
  initialPending: OtpState | null;
  serverTime: number;
}

/**
 * Cảnh báo "Email chưa được xác thực" đầu trang Hồ sơ (BR-S15) + nhập OTP ngay
 * trong thẻ. Xác thực xong mà tài khoản chưa có mật khẩu (tài khoản Google) thì
 * chuyển sang bước tạo mật khẩu (bỏ qua được — thẻ hiện lại ở lần mở trang sau).
 * Đã xác thực và đã có mật khẩu thì không hiện gì; vừa xong thì hiện thẻ thành
 * công tới khi rời trang.
 */
export function EmailVerificationCard({ email, isVerified, hasPassword, initialPending, serverTime }: EmailVerificationCardProps) {
  const verification = useEmailVerification({ initialIsVerified: isVerified, initialPending, serverTime });
  const { otpState, pending, error, inputKey } = verification;
  const [codeEntry, setCodeEntry] = useState({ key: inputKey, value: "" });
  const code = codeEntry.key === inputKey ? codeEntry.value : "";
  const now = useNow(Boolean(otpState) && !verification.isVerified);
  const passwordSetup = useInitialPassword();
  const [skippedPassword, setSkippedPassword] = useState(false);

  if (verification.isVerified) {
    if (!hasPassword && !passwordSetup.isCreated && !skippedPassword) {
      return (
        <Card id="xac-thuc-email" className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft">
              <KeyRound className="size-6 text-primary" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-text-primary">
                {verification.justVerified ? "Đã xác thực email — tạo mật khẩu" : "Tạo mật khẩu đăng nhập"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Tài khoản đang chỉ đăng nhập bằng Google. Tạo mật khẩu để đăng nhập được bằng{" "}
                <strong className="font-semibold text-text-primary break-all">{email}</strong> và mật khẩu, đồng thời dùng được
                “Quên mật khẩu” khi cần.
              </p>
              <CreatePasswordForm
                isSubmitting={passwordSetup.isSubmitting}
                serverError={passwordSetup.error}
                onClearError={passwordSetup.clearError}
                onSubmit={(password, confirmPassword) => void passwordSetup.submit(password, confirmPassword)}
                onSkip={() => setSkippedPassword(true)}
              />
            </div>
          </div>
        </Card>
      );
    }

    if (!verification.justVerified && !passwordSetup.isCreated) return null;

    return (
      <Card id="xac-thuc-email" className="p-5 sm:p-6 flex items-start gap-4" role="status">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success/15">
          <CheckCircle2 className="size-6 text-success" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            {passwordSetup.isCreated ? "Đã tạo mật khẩu" : "Đã xác thực email"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {passwordSetup.isCreated
              ? `Từ giờ bạn đăng nhập được bằng cả Google lẫn ${email} và mật khẩu.`
              : hasPassword
                ? `${email} đã được xác thực. Từ giờ bạn có thể lấy lại tài khoản qua “Quên mật khẩu” khi cần.`
                : `${email} đã được xác thực. Bạn có thể tạo mật khẩu ở đây vào lần mở Hồ sơ sau.`}
          </p>
        </div>
      </Card>
    );
  }

  const expiresInMs = otpState ? otpState.otpExpiresAt - now : 0;
  const hasLiveCode = Boolean(otpState) && expiresInMs > 0;
  const resendInMs = otpState ? otpState.resendAvailableAt - now : 0;
  const canResend = resendInMs <= 0 && pending === null;
  const showAttempts = otpState ? otpState.attemptsLeft < EMAIL_VERIFICATION_CONFIG.maxOtpAttempts : false;

  return (
    <Card id="xac-thuc-email" className="p-5 sm:p-6 border-warning/60 bg-warning/10">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warning/25">
          <MailWarning className="size-6 text-secondary-strong dark:text-warning" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-text-primary">Email chưa được xác thực</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Xác thực <strong className="font-semibold text-text-primary break-all">{email}</strong> để có thể dùng “Quên mật khẩu”
            khi cần. Trong lúc chưa xác thực, bạn vẫn dùng mọi tính năng khác bình thường.
          </p>

          {!otpState ? (
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => void verification.sendCode()}
                isLoading={pending === "send"}
                leftIcon={<MailCheck className="size-4" aria-hidden />}
                className="self-start"
              >
                {pending === "send" ? "Đang gửi mã..." : "Xác thực email"}
              </Button>
              <AuthInlineError message={error} />
            </div>
          ) : (
            <form
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (hasLiveCode && code.length === PASSWORD_RESET_CONFIG.otpLength) void verification.confirmCode(code);
              }}
            >
              <p className="text-sm text-text-primary">
                Nhập mã 6 chữ số vừa gửi tới <strong className="font-semibold">{otpState.maskedEmail}</strong>. Kiểm tra cả thư mục
                Spam nếu chưa thấy.
              </p>
              <OtpInput
                key={inputKey}
                length={PASSWORD_RESET_CONFIG.otpLength}
                autoFocus
                disabled={pending === "confirm" || !hasLiveCode}
                invalid={Boolean(error)}
                describedBy="verify-email-status verify-email-error"
                onChange={(value) => setCodeEntry({ key: inputKey, value })}
                onComplete={(value) => {
                  if (hasLiveCode) void verification.confirmCode(value);
                }}
              />
              <div id="verify-email-status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                <span
                  suppressHydrationWarning
                  className={cn("inline-flex items-center gap-1.5 tabular-nums", hasLiveCode ? "text-text-secondary" : "font-medium text-accent-ink")}
                >
                  <Clock className="size-4" aria-hidden />
                  {hasLiveCode ? `Mã hết hạn sau ${formatCountdown(expiresInMs)}` : "Mã không còn hiệu lực — hãy gửi mã mới"}
                </span>
                {showAttempts && hasLiveCode && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
                    <ShieldAlert className="size-3.5" aria-hidden />
                    Còn {otpState.attemptsLeft} lần thử
                  </span>
                )}
              </div>
              <AuthInlineError id="verify-email-error" message={error} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void verification.sendCode()}
                  disabled={!canResend}
                  suppressHydrationWarning
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:text-text-secondary dark:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RotateCw className={cn("size-4", pending === "send" && "animate-spin")} aria-hidden />
                  {pending === "send" ? "Đang gửi..." : canResend ? "Gửi mã mới" : `Gửi lại sau ${formatCountdown(resendInMs)}`}
                </button>
                <Button
                  type="submit"
                  isLoading={pending === "confirm"}
                  disabled={!hasLiveCode || code.length !== PASSWORD_RESET_CONFIG.otpLength}
                >
                  {pending === "confirm" ? "Đang xác thực..." : "Xác nhận"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}

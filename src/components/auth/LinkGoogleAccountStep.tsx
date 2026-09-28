"use client";

import { ArrowLeft, Info, Link2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { AuthCardHeader, AuthInlineError } from "@/components/auth/AuthCard";
import { OtpCodeForm } from "@/components/auth/OtpCodeForm";
import { EMAIL_VERIFICATION_CONFIG } from "@/constants/emailVerification";
import type { OtpState } from "@/services/passwordResetService";

interface LinkGoogleAccountStepProps {
  otpState: OtpState | null;
  inputKey: number;
  pending: "start" | "resend" | "confirm" | "signin" | null;
  error: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  /** Gửi mã lần đầu thất bại (SMTP lỗi, cooldown...) thì cho thử lại. */
  onRetryStart: () => void;
  onBack: () => void;
}

/**
 * Bước "Email đã liên kết với Google" của form Đăng ký: xác thực email bằng OTP
 * trước khi mật khẩu vừa nhập được thêm vào tài khoản Google đã có.
 */
export function LinkGoogleAccountStep({
  otpState,
  inputKey,
  pending,
  error,
  onVerify,
  onResend,
  onRetryStart,
  onBack,
}: LinkGoogleAccountStepProps) {
  const isBusy = pending === "confirm" || pending === "signin";

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        disabled={isBusy}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-5 disabled:opacity-60"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Quay lại
      </button>

      <AuthCardHeader
        focusOnMount
        icon={<Link2 className="size-3.5" aria-hidden />}
        badge="Xác thực email"
        title="Email đã liên kết Google"
        description="Email này đã được liên kết với tài khoản Google. Để thêm đăng nhập bằng mật khẩu, vui lòng xác thực email."
      />

      {otpState ? (
        <>
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-text-primary">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              Mã 6 chữ số đã được gửi tới <strong className="font-semibold">{otpState.maskedEmail}</strong>.
            </span>
          </p>
          <OtpCodeForm
            otpState={otpState}
            inputKey={inputKey}
            isVerifying={isBusy}
            isResending={pending === "resend"}
            error={error}
            maxAttempts={EMAIL_VERIFICATION_CONFIG.maxOtpAttempts}
            idPrefix="link-otp"
            onVerify={onVerify}
            onResend={onResend}
          />
        </>
      ) : pending === "start" ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-text-secondary" aria-busy="true">
          <Spinner />
          Đang gửi mã xác thực...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AuthInlineError message={error} />
          <Button type="button" size="lg" fullWidth onClick={onRetryStart} leftIcon={<MailCheck className="size-4.5" aria-hidden />}>
            Gửi mã xác thực
          </Button>
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Xác thực xong, bạn đăng nhập được bằng cả Google lẫn mật khẩu. Tên và ảnh đại diện của tài khoản hiện có được giữ nguyên.
      </p>
    </>
  );
}

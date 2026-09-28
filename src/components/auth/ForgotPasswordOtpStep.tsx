"use client";

import { MailCheck, PencilLine } from "lucide-react";
import { AuthCardHeader } from "@/components/auth/AuthCard";
import { OtpCodeForm } from "@/components/auth/OtpCodeForm";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import type { OtpState } from "@/services/passwordResetService";

interface ForgotPasswordOtpStepProps {
  otpState: OtpState;
  inputKey: number;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}

export function ForgotPasswordOtpStep({
  otpState,
  inputKey,
  isVerifying,
  isResending,
  error,
  onVerify,
  onResend,
  onChangeEmail,
}: ForgotPasswordOtpStepProps) {
  return (
    <>
      <AuthCardHeader
        focusOnMount
        icon={<MailCheck className="size-3.5" aria-hidden />}
        badge="Xác thực email"
        title="Nhập mã xác thực"
        description={
          <>
            Mã 6 chữ số đã được gửi tới <strong className="font-semibold text-text-primary">{otpState.maskedEmail}</strong>.{" "}
            <button
              type="button"
              onClick={onChangeEmail}
              className="inline-flex items-center gap-1 rounded font-semibold text-primary-strong dark:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <PencilLine className="size-3.5" aria-hidden />
              Đổi email
            </button>
          </>
        }
      />

      <OtpCodeForm
        otpState={otpState}
        inputKey={inputKey}
        isVerifying={isVerifying}
        isResending={isResending}
        error={error}
        maxAttempts={PASSWORD_RESET_CONFIG.maxOtpAttempts}
        idPrefix="otp"
        onVerify={onVerify}
        onResend={onResend}
      />
    </>
  );
}

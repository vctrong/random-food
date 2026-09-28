"use client";

import { useState } from "react";
import { Clock, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthInlineError } from "@/components/auth/AuthCard";
import { OtpInput } from "@/components/auth/OtpInput";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import { formatCountdown } from "@/features/password-reset/passwordResetLogic";
import { useNow } from "@/features/password-reset/useNow";
import { cn } from "@/lib/utils";
import type { OtpState } from "@/services/passwordResetService";

interface OtpCodeFormProps {
  otpState: OtpState;
  /** Đổi giá trị để xoá trắng các ô (nhập sai / gửi mã mới). */
  inputKey: number;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
  maxAttempts: number;
  /** Tiền tố id cho aria-describedby — tránh trùng khi có nhiều form trên 1 trang. */
  idPrefix: string;
  onVerify: (code: string) => void;
  onResend: () => void;
}

/**
 * Khối nhập OTP 6 số dùng chung các màn xác thực (Quên mật khẩu, thêm mật khẩu
 * cho tài khoản Google): ô nhập + đồng hồ hết hạn + số lần thử + gửi lại có cooldown.
 */
export function OtpCodeForm({
  otpState,
  inputKey,
  isVerifying,
  isResending,
  error,
  maxAttempts,
  idPrefix,
  onVerify,
  onResend,
}: OtpCodeFormProps) {
  // Gắn giá trị với inputKey: khi các ô bị xoá trắng (nhập sai / gửi mã mới) thì code cũng về rỗng.
  const [codeEntry, setCodeEntry] = useState({ key: inputKey, value: "" });
  const code = codeEntry.key === inputKey ? codeEntry.value : "";
  const now = useNow();
  const expiresInMs = otpState.otpExpiresAt - now;
  const isExpired = expiresInMs <= 0;
  const resendInMs = otpState.resendAvailableAt - now;
  const canResend = resendInMs <= 0 && !isResending;
  const showAttempts = otpState.attemptsLeft < maxAttempts;
  const isComplete = code.length === PASSWORD_RESET_CONFIG.otpLength;
  const statusId = `${idPrefix}-status`;
  const errorId = `${idPrefix}-error`;

  return (
    <>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (isComplete && !isExpired) onVerify(code);
        }}
      >
        <OtpInput
          key={inputKey}
          length={PASSWORD_RESET_CONFIG.otpLength}
          autoFocus
          disabled={isVerifying || isExpired}
          invalid={Boolean(error)}
          describedBy={`${statusId} ${errorId}`}
          onChange={(value) => setCodeEntry({ key: inputKey, value })}
          onComplete={(value) => {
            if (!isExpired) onVerify(value);
          }}
        />

        <div id={statusId} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <span
            className={cn("inline-flex items-center gap-1.5 tabular-nums", isExpired ? "text-accent-ink font-medium" : "text-text-secondary")}
            aria-live={isExpired ? "polite" : "off"}
          >
            <Clock className="size-4" aria-hidden />
            {isExpired ? "Mã đã hết hạn — hãy gửi lại mã mới" : `Mã hết hạn sau ${formatCountdown(expiresInMs)}`}
          </span>
          {showAttempts && !isExpired && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
              <ShieldAlert className="size-3.5" aria-hidden />
              Còn {otpState.attemptsLeft} lần thử
            </span>
          )}
        </div>

        <AuthInlineError id={errorId} message={error} />

        <Button type="submit" size="lg" fullWidth isLoading={isVerifying} disabled={!isComplete || isExpired}>
          {isVerifying ? "Đang xác thực..." : "Xác nhận mã"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 px-4 py-3.5 text-center">
        <p className="text-sm text-text-secondary">Chưa nhận được mã? Kiểm tra cả thư mục Spam/Quảng cáo.</p>
        <button
          type="button"
          onClick={onResend}
          disabled={!canResend}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:text-text-secondary dark:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RotateCw className={cn("size-4", isResending && "animate-spin")} aria-hidden />
          {isResending ? "Đang gửi..." : canResend ? "Gửi lại mã" : `Gửi lại sau ${formatCountdown(resendInMs)}`}
        </button>
        <p className="text-xs text-text-secondary" aria-live="polite">
          {otpState.sendsRemaining > 0
            ? `Còn ${otpState.sendsRemaining} lần gửi mã trong giờ này.`
            : "Bạn đã dùng hết lượt gửi mã trong giờ này."}
        </p>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Clock, Eye, EyeOff, Lock, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AUTH_INPUT_CLASS, AuthCardHeader, AuthInlineError } from "@/components/auth/AuthCard";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { formatCountdown } from "@/features/password-reset/passwordResetLogic";
import { useNow } from "@/features/password-reset/useNow";
import { isPasswordValid } from "@/lib/password";

interface ForgotPasswordNewPasswordStepProps {
  maskedEmail: string;
  sessionExpiresAt: number;
  isSubmitting: boolean;
  serverError: string | null;
  onClearError: () => void;
  onSubmit: (password: string, confirmPassword: string) => void;
  onRestart: () => void;
}

export function ForgotPasswordNewPasswordStep({
  maskedEmail,
  sessionExpiresAt,
  isSubmitting,
  serverError,
  onClearError,
  onSubmit,
  onRestart,
}: ForgotPasswordNewPasswordStepProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const now = useNow();
  const remainingMs = sessionExpiresAt - now;
  const isSessionExpired = remainingMs <= 0;

  const policyOk = isPasswordValid(password);
  const isMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const isMatch = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmit = policyOk && isMatch && !isSessionExpired;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(password, confirmPassword);
  }

  function clearServerError() {
    if (serverError) onClearError();
  }

  return (
    <>
      <AuthCardHeader
        focusOnMount
        icon={<LockKeyhole className="size-3.5" aria-hidden />}
        badge="Bước cuối cùng"
        title="Tạo mật khẩu mới"
        description={
          <>
            Cho tài khoản <strong className="font-semibold text-text-primary">{maskedEmail}</strong>. Mật khẩu mới phải khác mật khẩu
            hiện tại.
          </>
        }
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="new-password-field" className="text-sm font-medium text-text-primary">
            Mật khẩu mới
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
            <input
              id="new-password-field"
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearServerError();
              }}
              placeholder="Tối thiểu 8 ký tự, có chữ, số và ký tự đặc biệt"
              aria-describedby="new-password-strength"
              className={AUTH_INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
              aria-pressed={showPassword}
              className="absolute right-2 grid size-9 place-items-center rounded-lg text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {showPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
            </button>
          </div>
          <PasswordStrengthMeter id="new-password-strength" password={password} />
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="confirm-new-password-field" className="text-sm font-medium text-text-primary">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative flex items-center">
            <ShieldCheck className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
            <input
              id="confirm-new-password-field"
              name="confirm-new-password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearServerError();
              }}
              placeholder="Nhập lại mật khẩu mới"
              aria-invalid={isMismatch || undefined}
              aria-describedby={isMismatch ? "confirm-new-password-error" : undefined}
              className={AUTH_INPUT_CLASS}
            />
            {isMatch ? (
              <Check className="absolute right-12 size-4.5 text-success pointer-events-none" aria-label="Mật khẩu trùng khớp" />
            ) : null}
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
              aria-pressed={showConfirm}
              className="absolute right-2 grid size-9 place-items-center rounded-lg text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {showConfirm ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
            </button>
          </div>
          <AuthInlineError id="confirm-new-password-error" message={isMismatch ? "Mật khẩu xác nhận không khớp." : null} />
        </div>

        <AuthInlineError message={serverError} />

        <p
          className={
            isSessionExpired
              ? "inline-flex items-center justify-center gap-1.5 text-sm font-medium text-accent-ink"
              : "inline-flex items-center justify-center gap-1.5 text-xs text-text-secondary tabular-nums"
          }
          aria-live={isSessionExpired ? "polite" : "off"}
        >
          <Clock className="size-3.5" aria-hidden />
          {isSessionExpired
            ? "Phiên đặt lại mật khẩu đã hết hạn."
            : `Phiên đặt lại mật khẩu còn hiệu lực ${formatCountdown(remainingMs)}`}
        </p>

        {isSessionExpired ? (
          <Button type="button" size="lg" fullWidth onClick={onRestart} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
            Bắt đầu lại
          </Button>
        ) : (
          <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} disabled={!canSubmit}>
            {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </Button>
        )}
      </form>

      {!isSessionExpired && (
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 mx-auto flex items-center gap-1.5 rounded text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Làm lại với email khác
        </button>
      )}
    </>
  );
}

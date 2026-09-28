"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AUTH_INPUT_CLASS, AuthInlineError } from "@/components/auth/AuthCard";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { isPasswordValid } from "@/lib/password";

interface CreatePasswordFormProps {
  isSubmitting: boolean;
  serverError: string | null;
  onClearError: () => void;
  onSubmit: (password: string, confirmPassword: string) => void;
  onSkip: () => void;
}

/** Nhập mật khẩu + xác nhận (cùng chính sách với form Đăng ký) — dùng trong thẻ xác thực email ở Hồ sơ. */
export function CreatePasswordForm({ isSubmitting, serverError, onClearError, onSubmit, onSkip }: CreatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const policyOk = isPasswordValid(password);
  const isMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const isMatch = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmit = policyOk && isMatch;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(password, confirmPassword);
  }

  function clearServerError() {
    if (serverError) onClearError();
  }

  return (
    <form
      className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-password-field" className="text-sm font-medium text-text-primary">
          Mật khẩu
        </label>
        <div className="relative flex items-center">
          <Lock className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
          <input
            id="create-password-field"
            name="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearServerError();
            }}
            placeholder="Tối thiểu 8 ký tự, có chữ, số và ký tự đặc biệt"
            aria-describedby="create-password-strength"
            className={AUTH_INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={showPassword}
            className="absolute right-2 grid size-9 place-items-center rounded-lg text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {showPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
          </button>
        </div>
        <PasswordStrengthMeter id="create-password-strength" password={password} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-password-confirm-field" className="text-sm font-medium text-text-primary">
          Xác nhận mật khẩu
        </label>
        <div className="relative flex items-center">
          <ShieldCheck className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
          <input
            id="create-password-confirm-field"
            name="confirm-new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearServerError();
            }}
            placeholder="Nhập lại mật khẩu"
            aria-invalid={isMismatch || undefined}
            aria-describedby={isMismatch ? "create-password-confirm-error" : undefined}
            className={AUTH_INPUT_CLASS}
          />
          {isMatch && <Check className="absolute right-3.5 size-4.5 text-success pointer-events-none" aria-label="Mật khẩu trùng khớp" />}
        </div>
        <AuthInlineError id="create-password-confirm-error" message={isMismatch ? "Mật khẩu xác nhận không khớp." : null} />
      </div>

      <AuthInlineError message={serverError} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onSkip} disabled={isSubmitting}>
          Để sau
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
          {isSubmitting ? "Đang lưu..." : "Tạo mật khẩu"}
        </Button>
      </div>
    </form>
  );
}

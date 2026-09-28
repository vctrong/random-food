"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AUTH_INPUT_CLASS, AuthCardHeader, AuthInlineError } from "@/components/auth/AuthCard";
import { isValidEmail, normalizeEmail } from "@/features/password-reset/passwordResetLogic";

interface ForgotPasswordEmailStepProps {
  initialEmail: string;
  isSubmitting: boolean;
  serverError: string | null;
  serverErrorCode: string | null;
  onClearError: () => void;
  onSubmit: (email: string) => void;
}

export function ForgotPasswordEmailStep({
  initialEmail,
  isSubmitting,
  serverError,
  serverErrorCode,
  onClearError,
  onSubmit,
}: ForgotPasswordEmailStepProps) {
  const [email, setEmail] = useState(initialEmail);
  // Chỉ báo sai định dạng sau khi rời ô / bấm gửi — không "mắng" khi người dùng đang gõ dở.
  const [touched, setTouched] = useState(false);
  const isValid = isValidEmail(normalizeEmail(email));
  const formatError = touched && email && !isValid ? "Email chưa đúng định dạng. Ví dụ: tenban@email.com" : null;
  const error = formatError ?? serverError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit(email);
  }

  return (
    <>
      <AuthCardHeader
        icon={<KeyRound className="size-3.5" aria-hidden />}
        badge="Khôi phục tài khoản"
        title="Quên mật khẩu?"
        description="Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã xác thực gồm 6 chữ số để bạn đặt mật khẩu mới."
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1.5 text-left">
          <label htmlFor="forgot-email-field" className="text-sm font-medium text-text-primary">
            Email
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
            <input
              id="forgot-email-field"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (serverError) onClearError();
              }}
              onBlur={() => setTouched(true)}
              placeholder="tenban@email.com"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "forgot-email-error" : undefined}
              className={AUTH_INPUT_CLASS}
            />
            {isValid && (
              <CheckCircle2 className="absolute right-3.5 size-4.5 text-success pointer-events-none" aria-label="Email hợp lệ" />
            )}
          </div>
          <AuthInlineError id="forgot-email-error" message={error} />
          {!formatError && serverErrorCode === "ACCOUNT_NOT_FOUND" && (
            <p className="text-xs leading-relaxed text-text-secondary">
              Đã có tài khoản nhưng chưa xác thực email? Hãy{" "}
              <Link href="/dang-nhap?callbackUrl=%2Fho-so" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                đăng nhập
              </Link>{" "}
              rồi bấm “Xác thực email” trong trang Hồ sơ.
            </p>
          )}
          {!formatError && serverErrorCode === "GOOGLE_ACCOUNT" && (
            <Link href="/dang-nhap" className="text-xs font-semibold text-primary-strong hover:underline dark:text-primary">
              Đến trang đăng nhập →
            </Link>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} rightIcon={<Send className="size-4" aria-hidden />}>
          {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác thực"}
        </Button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-text-secondary text-center">
        Chỉ tài khoản đã xác thực email mới đặt lại được mật khẩu. Tài khoản Google không có mật khẩu riêng — hãy chọn “Tiếp tục với Google” ở trang đăng nhập.
      </p>

      <div className="mt-6 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 sm:px-8 py-4 bg-primary-soft/50 text-center rounded-b-2xl">
        <Link
          href="/dang-nhap"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-primary-strong dark:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Quay lại đăng nhập
        </Link>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LogIn, MailWarning, PartyPopper, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthCardHeader } from "@/components/auth/AuthCard";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import { formatCountdown } from "@/features/password-reset/passwordResetLogic";
import { useNow } from "@/features/password-reset/useNow";

/** Màn hình thành công — tự chuyển về đăng nhập sau vài giây (dừng được nếu người dùng muốn đọc). */
export function ForgotPasswordSuccess() {
  const router = useRouter();
  const [redirectAt] = useState(() => Date.now() + PASSWORD_RESET_CONFIG.successRedirectMs);
  const [isAutoRedirect, setIsAutoRedirect] = useState(true);
  const now = useNow(isAutoRedirect, 250);
  const secondsLeft = Math.max(0, Math.ceil((redirectAt - now) / 1000));

  useEffect(() => {
    if (isAutoRedirect && secondsLeft === 0) router.replace("/dang-nhap");
  }, [isAutoRedirect, secondsLeft, router]);

  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-5 grid size-20 place-items-center rounded-full bg-success/15 animate-fade-slide-up">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
      </span>
      <AuthCardHeader
        focusOnMount
        icon={<PartyPopper className="size-3.5" aria-hidden />}
        badge="Hoàn tất"
        title="Đổi mật khẩu thành công!"
        description="Bạn có thể đăng nhập ngay bằng mật khẩu mới. Để bảo vệ tài khoản, mọi thiết bị khác đã được đăng xuất."
      />
      <Button href="/dang-nhap" size="lg" fullWidth rightIcon={<ArrowRight className="size-4.5" aria-hidden />}>
        Về trang đăng nhập
      </Button>
      {isAutoRedirect ? (
        <p className="mt-4 text-sm text-text-secondary" aria-live="polite">
          Tự chuyển sau {secondsLeft} giây ·{" "}
          <button
            type="button"
            onClick={() => setIsAutoRedirect(false)}
            className="rounded font-medium text-primary-strong hover:underline dark:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Ở lại trang này
          </button>
        </p>
      ) : null}
    </div>
  );
}

interface ForgotPasswordLockedProps {
  maskedEmail: string;
  cooldownUntil: number;
  isResending: boolean;
  onResend: () => void;
  onUseAnotherEmail: () => void;
}

/** Tài khoản đang tạm khoá (sai OTP quá số lần) — hướng dẫn mở khoá qua email. */
export function ForgotPasswordLocked({ maskedEmail, cooldownUntil, isResending, onResend, onUseAnotherEmail }: ForgotPasswordLockedProps) {
  const now = useNow(cooldownUntil > 0);
  const waitMs = cooldownUntil - now;

  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-5 grid size-20 place-items-center rounded-full bg-accent-soft">
        <ShieldAlert className="size-10 text-accent-ink" aria-hidden />
      </span>
      <AuthCardHeader
        focusOnMount
        tone="accent"
        icon={<MailWarning className="size-3.5" aria-hidden />}
        badge="Bảo vệ tài khoản"
        title="Tài khoản đang tạm khoá"
        description={
          <>
            Mã xác thực đã bị nhập sai {PASSWORD_RESET_CONFIG.maxOtpAttempts} lần nên tài khoản{" "}
            <strong className="font-semibold text-text-primary">{maskedEmail}</strong> đã được tạm khoá. Hãy mở email cảnh báo
            và bấm <strong className="font-semibold text-text-primary">“Mở khoá tài khoản”</strong>. Mật khẩu hiện tại vẫn giữ
            nguyên.
          </>
        }
      />
      <div className="flex w-full flex-col gap-2.5">
        <Button
          type="button"
          size="lg"
          fullWidth
          isLoading={isResending}
          disabled={waitMs > 0}
          onClick={onResend}
          leftIcon={<RotateCw className="size-4" aria-hidden />}
        >
          {waitMs > 0 ? `Gửi lại email mở khoá sau ${formatCountdown(waitMs)}` : "Gửi lại email mở khoá"}
        </Button>
        <Button href="/dang-nhap" variant="secondary" size="lg" fullWidth leftIcon={<LogIn className="size-4" aria-hidden />}>
          Về trang đăng nhập
        </Button>
      </div>
      <button
        type="button"
        onClick={onUseAnotherEmail}
        className="mt-5 rounded text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Dùng email khác
      </button>
    </div>
  );
}

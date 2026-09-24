"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Soup } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getAuthErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { sanitizeCallbackUrl } from "@/lib/safe-redirect";
import { GoogleIcon } from "./GoogleIcon";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Chống open-redirect: callbackUrl đến từ query string do client kiểm soát được.
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        remember: remember ? "true" : "false",
        redirect: false,
      });

      setIsSubmitting(false);

      if (result?.error) {
        showToast(getAuthErrorMessage(result.error), "error");
        return;
      }

      showToast("Đăng nhập thành công!", "success");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      showToast(getNetworkErrorMessage(), "error");
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[440px]">
        <div
          aria-hidden
          className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary-soft blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-accent-soft blur-3xl pointer-events-none -z-10"
        />

        <div className="relative overflow-hidden bg-surface rounded-2xl shadow-xl p-6 md:p-8">
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary to-accent"
          />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-soft text-primary text-sm font-medium mb-4 shadow-sm">
              <Soup className="size-3.5" aria-hidden />
              <span>Đồng hành cùng bữa ngon của bạn</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-1.5">
              Chào mừng bạn quay trở lại
            </h1>
            <p className="text-sm text-text-secondary max-w-sm">
              Đăng nhập để lưu lại sở thích ẩm thực và nhật ký món ngon hôm nay.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="email-field" className="text-sm font-medium text-text-primary">
                Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                <input
                  id="email-field"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tenban@email.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="password-field" className="text-sm font-medium text-text-primary">
                Mật khẩu
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                <input
                  id="password-field"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                  className="absolute right-3.5 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="size-4 rounded border-border accent-primary cursor-pointer"
                />
                Ghi nhớ đăng nhập
              </label>
              <Link
                href="/quen-mat-khau"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="size-4.5" aria-hidden />}
            >
              Đăng nhập
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-border" />
            </div>
            <span className="relative bg-surface px-4 text-xs text-text-secondary">hoặc tiếp tục với</span>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full h-12 px-4 rounded-xl border border-border bg-surface hover:bg-primary-soft text-text-primary text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.99]"
          >
            <GoogleIcon className="size-5" />
            <span>Tiếp tục với Google</span>
          </button>

          <div className="mt-6 -mx-6 -mb-6 md:-mx-8 md:-mb-8 px-6 md:px-8 py-5 bg-primary-soft/50 text-center rounded-b-2xl">
            <p className="text-sm text-text-secondary">
              Chưa có tài khoản?{" "}
              <Link href="/dang-ky" className="font-semibold text-accent-ink hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface shadow-sm text-text-secondary text-xs">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden />
            <span>Bảo mật thông tin &amp; đồng bộ nhật ký ăn uống tức thì</span>
          </div>
        </div>
      </div>
    </div>
  );
}

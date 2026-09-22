"use client";

import { signIn } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

interface LoginPromptInlineProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Gợi ý đăng nhập Google inline cho các phần cần đăng nhập ở trang Cài đặt
 * (Guest vẫn xem được cả trang, chỉ phần này bị khoá) — thay vì ẩn hẳn trống
 * theo đúng yêu cầu mục 4.
 */
export function LoginPromptInline({ icon: Icon, title, description }: LoginPromptInlineProps) {
  return (
    <div className="bg-surface rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-3 scroll-mt-24">
      <div className="w-12 h-12 rounded-2xl bg-soft-blue text-primary-blue flex items-center justify-center">
        <Icon className="size-6" aria-hidden />
      </div>
      <div>
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: typeof window !== "undefined" ? window.location.pathname : "/" })}
        className="inline-flex items-center gap-2.5 h-11 px-5 rounded-full border border-border bg-surface hover:bg-soft-blue text-text-primary text-sm font-semibold shadow-sm transition-all active:scale-95"
      >
        <GoogleIcon className="size-4.5" />
        <span>Tiếp tục với Google</span>
      </button>
    </div>
  );
}

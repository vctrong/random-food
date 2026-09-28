"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Class ô input dùng chung các form xác thực — khớp LoginForm/RegisterForm. */
export const AUTH_INPUT_CLASS =
  "w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary aria-[invalid=true]:border-accent-strong aria-[invalid=true]:focus:ring-accent/40";

/** Khung card của các trang xác thực (đăng nhập, quên mật khẩu, mở khoá) — cùng bố cục LoginForm. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[460px]">
        <div
          aria-hidden
          className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary-soft blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-accent-soft blur-3xl pointer-events-none -z-10"
        />
        <div className="relative overflow-hidden bg-surface rounded-2xl shadow-xl p-6 sm:p-8">
          <div aria-hidden className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary to-accent" />
          {children}
        </div>
      </div>
    </div>
  );
}

/** Thông báo lỗi inline dưới field/khối — role="alert" để trình đọc màn hình đọc ngay. */
export function AuthInlineError({ id, message }: { id?: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm leading-snug text-accent-ink">
      {message}
    </p>
  );
}

interface AuthCardHeaderProps {
  icon: ReactNode;
  badge: string;
  title: string;
  description?: ReactNode;
  tone?: "primary" | "accent";
  /** Chuyển focus vào tiêu đề khi mount — dùng khi đổi bước để trình đọc màn hình biết đang ở đâu. */
  focusOnMount?: boolean;
}

export function AuthCardHeader({ icon, badge, title, description, tone = "primary", focusOnMount }: AuthCardHeaderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <div className="flex flex-col items-center text-center mb-6">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-sm font-medium mb-4 shadow-sm",
          tone === "primary" ? "bg-primary-soft text-primary-strong dark:text-primary" : "bg-accent-soft text-accent-ink",
        )}
      >
        {icon}
        <span>{badge}</span>
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-1.5 focus:outline-none"
      >
        {title}
      </h1>
      {description && <div className="text-sm text-text-secondary max-w-sm leading-relaxed">{description}</div>}
    </div>
  );
}

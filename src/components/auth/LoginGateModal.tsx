"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GoogleIcon } from "./GoogleIcon";

interface LoginGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
  title?: string;
  description?: string;
}

export function LoginGateModal({
  isOpen,
  onClose,
  callbackUrl,
  title = "Đăng nhập để lưu món ăn yêu thích của bạn",
  description = "Tài khoản giúp bạn lưu món, xem lại lịch sử đã ăn và nhận gợi ý hợp khẩu vị hơn.",
}: LoginGateModalProps) {
  const resolvedCallbackUrl =
    callbackUrl ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const loginHref = `/dang-nhap?callbackUrl=${encodeURIComponent(resolvedCallbackUrl)}`;
  const registerHref = `/dang-ky?callbackUrl=${encodeURIComponent(resolvedCallbackUrl)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-sm p-6 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center mb-4">
        <Heart className="size-6" aria-hidden />
      </div>

      <h3 className="text-lg font-bold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary mb-6">{description}</p>

      <div className="flex flex-col w-full gap-2">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: resolvedCallbackUrl })}
          className="w-full h-11 px-4 rounded-full border border-border bg-surface hover:bg-primary-soft text-text-primary text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95"
        >
          <GoogleIcon className="size-4.5" />
          <span>Tiếp tục với Google</span>
        </button>
        <Link
          href={loginHref}
          className="w-full h-11 rounded-full bg-primary-strong text-white font-semibold shadow-md hover:bg-primary-strong-hover transition-all active:scale-95 flex items-center justify-center"
        >
          Đăng nhập bằng email
        </Link>
        <Link href={registerHref} className="text-sm text-text-secondary hover:text-primary mt-1">
          Chưa có tài khoản? <span className="font-semibold text-accent-ink">Đăng ký</span>
        </Link>
      </div>
    </Modal>
  );
}

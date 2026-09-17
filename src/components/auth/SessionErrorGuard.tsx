"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";

const ERROR_MESSAGES: Record<string, string> = {
  SessionExpired: "Phiên đăng nhập đã hết hạn do không hoạt động, vui lòng đăng nhập lại.",
  SessionRevoked: "Phiên đăng nhập đã bị thu hồi (đổi mật khẩu hoặc đăng xuất từ thiết bị khác).",
};

/**
 * Theo dõi lỗi session do callbacks.session() gắn vào (lib/auth.ts) khi phiên
 * bị hết hạn do idle 30 phút hoặc bị thu hồi (đổi mật khẩu/khoá tài khoản/đăng
 * xuất mọi thiết bị) — server đã âm thầm gỡ session.user, component này chỉ
 * hoàn tất việc đăng xuất ở client (xoá cookie) và báo cho người dùng biết.
 */
export function SessionErrorGuard() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const hasHandled = useRef(false);

  useEffect(() => {
    const error = (session as { error?: string } | null | undefined)?.error;
    if (!error || hasHandled.current) return;
    hasHandled.current = true;

    signOut({ redirect: false }).then(() => {
      showToast(ERROR_MESSAGES[error] ?? "Phiên đăng nhập không còn hợp lệ, vui lòng đăng nhập lại.", "warning");
      router.push("/");
      router.refresh();
    });
  }, [session, showToast, router]);

  return null;
}

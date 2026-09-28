"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { createInitialPassword } from "@/services/emailVerificationService";

/**
 * Tạo mật khẩu đầu tiên trong trang Hồ sơ (tài khoản Google đã xác thực email).
 * Xong thì router.refresh() để phần Bảo mật (server-render) hiện form Đổi mật khẩu.
 */
export function useInitialPassword() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreated, setIsCreated] = useState(false);

  const submit = useCallback(
    async (password: string, confirmPassword: string) => {
      setIsSubmitting(true);
      setError(null);
      const result = await createInitialPassword(password, confirmPassword);
      setIsSubmitting(false);
      if (result.ok || result.code === "ALREADY_HAS_PASSWORD") {
        setIsCreated(true);
        showToast("Đã tạo mật khẩu!", "success", { description: "Từ giờ bạn đăng nhập được bằng cả Google lẫn email và mật khẩu." });
        router.refresh();
        return;
      }
      setError(result.message);
      if (result.status === 0 || result.status >= 500) showToast(result.message, "error");
    },
    [router, showToast],
  );

  return { isSubmitting, error, isCreated, submit, clearError: () => setError(null) };
}

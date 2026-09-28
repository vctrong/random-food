"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Fallback phía client cho BR-S09 — lớp chính là redirectIfAuthenticated()
 * ở server. Bắt các ca server không thấy: đăng nhập ở tab khác rồi quay lại
 * form, hoặc trang được khôi phục từ bfcache sau khi đã đăng nhập.
 * `disabled` khi form đang tự xử lý chuyển trang sau submit, tránh 2 lần điều hướng.
 */
export function useGuestOnlyRedirect(target: string, disabled: boolean) {
  const { data: session } = useSession();
  const router = useRouter();
  // Phiên idle/bị thu hồi vẫn có object session nhưng không có user → vẫn là khách.
  const isAuthenticated = Boolean(session?.user);

  useEffect(() => {
    if (isAuthenticated && !disabled) router.replace(target);
  }, [isAuthenticated, disabled, router, target]);
}

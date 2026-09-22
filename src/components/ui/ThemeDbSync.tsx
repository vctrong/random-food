"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

/**
 * Đồng bộ theme 2 chiều cho user ĐÃ đăng nhập — Guest chỉ dùng localStorage
 * (next-themes tự lo, xem ThemeProvider.tsx). Component rỗng, không render UI.
 *
 * - Lúc đăng nhập/tải trang: nếu DB có theme đã lưu, áp dụng nó (đổi thiết bị vẫn
 *   giữ đúng theme đã chọn trước đó) — chỉ áp 1 lần/phiên để không đè lựa chọn
 *   người dùng vừa đổi ở thiết bị hiện tại.
 * - Khi user đổi theme ở thiết bị này: ghi lại vào DB (fire-and-forget) để đồng
 *   bộ sang thiết bị khác lần sau.
 */
export function ThemeDbSync() {
  const { status } = useSession();
  const { theme, setTheme } = useTheme();
  const hasAppliedDbTheme = useRef(false);
  const isFirstThemeEffect = useRef(true);

  useEffect(() => {
    if (status !== "authenticated" || hasAppliedDbTheme.current) return;
    hasAppliedDbTheme.current = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { theme?: string | null } | null) => {
        if (data?.theme) setTheme(data.theme);
      })
      .catch(() => {
        // Không chặn UI nếu đồng bộ theme thất bại — giữ theme hiện tại (localStorage).
      });
  }, [status, setTheme]);

  useEffect(() => {
    if (status !== "authenticated" || !theme) return;
    if (isFirstThemeEffect.current) {
      // Bỏ qua lần chạy đầu (giá trị mount ban đầu, chưa chắc là do user chủ động đổi).
      isFirstThemeEffect.current = false;
      return;
    }
    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
      keepalive: true,
    }).catch(() => {
      // Ghi nhận theme lên DB không quan trọng bằng trải nghiệm — im lặng bỏ qua lỗi.
    });
  }, [theme, status]);

  return null;
}

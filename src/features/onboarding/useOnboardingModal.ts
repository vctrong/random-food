"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ONBOARDING_OPEN_DELAY_MS,
  ONBOARDING_SESSION_DISMISS_KEY,
  ONBOARDING_SNOOZE_KEY,
} from "@/constants/onboarding";
import { isOnboardingAllowedPath, isSnoozeActive } from "./onboardingLogic";

/** Storage có thể bị chặn (chế độ riêng tư, chính sách trình duyệt) — lỗi thì coi như chưa đóng. */
function shouldShowOnboarding(): boolean {
  try {
    if (window.sessionStorage.getItem(ONBOARDING_SESSION_DISMISS_KEY)) return false;
  } catch {
    // bỏ qua, xét tiếp localStorage
  }
  try {
    if (isSnoozeActive(window.localStorage.getItem(ONBOARDING_SNOOZE_KEY), Date.now())) return false;
  } catch {
    // bỏ qua → hiện modal
  }
  return true;
}

function safeWrite(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // Không ghi được thì chỉ ẩn trong lần mount hiện tại (xem `hasHandledRef`).
  }
}

/**
 * Hiển thị modal hướng dẫn khi người dùng vào web.
 * - Server và lượt render đầu ở client đều trả `isOpen = false`, storage chỉ đọc
 *   trong useEffect → không lệch hydration, không nháy modal rồi tắt.
 * - Chỉ xét 1 lần mỗi lần tải trang, ở trang đầu tiên thuộc danh sách cho phép
 *   (vào /ho-so trước rồi sang trang chủ vẫn hiện). Root layout giữ nguyên
 *   qua các lần chuyển trang nên ref này đủ chặn hiện lại dù storage bị chặn.
 * - Đang mở mà chuyển sang trang không được phép → ẩn luôn (không tính là "đã đóng").
 */
export function useOnboardingModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current || !isOnboardingAllowedPath(pathname)) return;

    // Đánh dấu bên trong timeout chứ không phải ngay đầu effect: StrictMode (dev)
    // chạy effect → cleanup → effect, đánh dấu sớm sẽ khiến modal không bao giờ mở.
    const timeout = window.setTimeout(() => {
      hasHandledRef.current = true;
      if (shouldShowOnboarding()) setIsOpen(true);
    }, ONBOARDING_OPEN_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  /** "Đóng", nút X, bấm ra overlay, phím Esc. */
  const close = useCallback(() => {
    setIsOpen(false);
    safeWrite(() => window.sessionStorage, ONBOARDING_SESSION_DISMISS_KEY, "1");
  }, []);

  /** "Đóng 24h". */
  const snooze = useCallback(() => {
    setIsOpen(false);
    safeWrite(() => window.localStorage, ONBOARDING_SNOOZE_KEY, String(Date.now()));
  }, []);

  return { isOpen: isOpen && isOnboardingAllowedPath(pathname), close, snooze };
}

"use client";

import { useEffect } from "react";

/**
 * Cảnh báo trình duyệt (dialog gốc, không tuỳ biến được nội dung) khi user đóng
 * tab/refresh lúc form còn thay đổi chưa lưu. Next.js App Router chưa có API chặn
 * điều hướng trong-app (client-side) ổn định như Pages Router `router.events` —
 * đây là phần chưa che được (điều hướng bằng Link/router.push trong app vẫn đi
 * thẳng), chỉ chặn được đóng tab/refresh/rời domain.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
}

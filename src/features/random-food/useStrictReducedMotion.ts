"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  // Cài đặt "Giảm chuyển động" trong app gắn class .reduce-motion lên <html> (useSettings.ts).
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches || document.documentElement.classList.contains("reduce-motion");
}

/**
 * Giống useReducedMotion của framer-motion nhưng tính cả công tắc "Giảm chuyển động"
 * trong Cài đặt — dùng cho hiệu ứng điều khiển bằng JS (parallax, tilt) mà rule CSS
 * global không tự tắt được.
 */
export function useStrictReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

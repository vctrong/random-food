"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, TICK_MS);
  return () => window.clearInterval(id);
}

// Làm tròn theo nhịp tick để snapshot ổn định giữa các lần render (yêu cầu của useSyncExternalStore).
function getSnapshot() {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

/**
 * Thời điểm hiện tại, tự cập nhật mỗi 30 giây — dùng cho bộ đếm thời hạn đánh giá.
 * Trả null khi SSR/hydrate để tránh lệch giờ server ↔ client.
 */
export function useNow(): number | null {
  return useSyncExternalStore<number | null>(subscribe, getSnapshot, () => null);
}

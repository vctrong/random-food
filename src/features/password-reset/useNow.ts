"use client";

import { useEffect, useState } from "react";

/** Đồng hồ cập nhật mỗi giây cho các bộ đếm ngược; `active=false` thì dừng tick để đỡ render thừa. */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    // Cập nhật ngay nhịp đầu (bật lại sau khi dừng thì giá trị cũ đã lỗi thời).
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [active, intervalMs]);
  return now;
}

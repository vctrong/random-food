"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/** Còn dưới mốc này thì tô cảnh báo. */
const WARNING_THRESHOLD_MS = 6 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Đã quá hạn — đề xuất sẽ tự nhả";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Còn ${hours} giờ ${minutes} phút` : `Còn ${minutes} phút`;
}

/** Thời hạn giữ đề xuất còn lại trước khi tự nhả về "Chờ nhận" — cập nhật mỗi phút. */
export function ClaimCountdown({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = new Date(expiresAt).getTime() - now;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        remaining < WARNING_THRESHOLD_MS ? "text-accent-ink" : "text-text-secondary",
        className,
      )}
      title={`Tự nhả lúc ${new Date(expiresAt).toLocaleString("vi-VN")}`}
    >
      <Timer className="size-3.5" aria-hidden />
      {formatRemaining(remaining)}
    </span>
  );
}

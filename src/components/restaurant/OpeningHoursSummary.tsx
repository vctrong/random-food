"use client";

import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import { formatOpeningSchedule, getOpenStatus, type OpenState } from "@/features/opening-hours/openingHours";
import { cn } from "@/lib/utils";
import type { OpeningSchedule } from "@/types/restaurant";

const STATE_LABEL: Record<Exclude<OpenState, "unknown">, { text: string; className: string }> = {
  open: { text: "Đang mở", className: "bg-success/15 text-success" },
  closing_soon: { text: "Sắp đóng", className: "bg-warning/20 text-secondary-strong dark:text-warning" },
  closed: { text: "Đã đóng", className: "bg-border text-text-secondary" },
};

/** Đồng hồ theo phút dùng chung — server trả null (không tính trạng thái lúc SSR để không lệch hydrate). */
const currentMinute = () => Math.floor(Date.now() / 60_000);
function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(timer);
}

interface OpeningHoursSummaryProps {
  schedule: OpeningSchedule | null | undefined;
  /** Kèm nhãn Đang mở / Sắp đóng / Đã đóng (tính sau khi mount để không lệch giờ server ↔ client). */
  showStatus?: boolean;
  className?: string;
}

/** Giờ mở cửa dạng gọn; "Không rõ giờ" → "Chưa có giờ mở cửa". */
export function OpeningHoursSummary({ schedule, showStatus = false, className }: OpeningHoursSummaryProps) {
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);

  const resolved: OpeningSchedule = schedule ?? { status: "unknown" };
  const status = showStatus && now ? getOpenStatus(resolved, now) : null;
  const badge = status && status.state !== "unknown" ? STATE_LABEL[status.state] : null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className={cn(resolved.status === "unknown" && "italic text-text-secondary")}>{formatOpeningSchedule(resolved)}</span>
      {badge && (
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
          {badge.text}
          {status?.closesAt && status.state !== "closed" ? ` · đóng ${status.closesAt}` : ""}
        </span>
      )}
    </span>
  );
}

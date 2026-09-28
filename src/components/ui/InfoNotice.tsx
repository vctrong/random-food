import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoNoticeProps {
  children: ReactNode;
  tone?: "primary" | "accent";
  size?: "sm" | "xs";
  className?: string;
}

/**
 * Khối ghi chú mềm (không phải cảnh báo lỗi): nền pha rất nhạt từ primary/accent,
 * viền mảnh cùng tông, chữ nhỏ màu dịu. Nội dung câu nhắc nằm ở constants/infoNotice.ts.
 */
export function InfoNotice({ children, tone = "primary", size = "sm", className }: InfoNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 leading-relaxed text-text-secondary",
        tone === "primary" ? "border-primary/15 bg-primary/[0.06]" : "border-accent/30 bg-accent/[0.08]",
        size === "sm" ? "text-sm" : "text-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldLabelProps {
  children: ReactNode;
  /** Gắn với input (label thật). Bỏ trống khi nhãn cho 1 nhóm (chip, ảnh…) — dùng `id` + aria-labelledby. */
  htmlFor?: string;
  id?: string;
  required?: boolean;
  /** Mục bắt buộc đã điền hợp lệ → ✦ nở thành ✓. */
  valid?: boolean;
  /** Chú thích nhỏ bên dưới nhãn. */
  hint?: ReactNode;
  className?: string;
}

/**
 * Nhãn trường form thay kiểu dấu sao đỏ: mục bắt buộc có hạt ✦ "thở" nhẹ, điền
 * hợp lệ thì xoay/nở thành ✓; mục không bắt buộc ghi "(nếu có)". Hiệu ứng tự tắt
 * theo prefers-reduced-motion / Cài đặt "Giảm chuyển động" (rule global trong
 * globals.css). Input tương ứng vẫn phải tự đặt `aria-required`.
 */
export function FieldLabel({ children, htmlFor, id, required = false, valid = false, hint, className }: FieldLabelProps) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <Tag htmlFor={htmlFor} id={id} className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        <span>{children}</span>
        {required ? (
          <>
            <span
              // Đổi key để animation chạy lại mỗi lần chuyển trạng thái.
              key={valid ? "valid" : "required"}
              aria-hidden
              className={cn(
                "inline-flex size-4 items-center justify-center leading-none",
                valid ? "text-primary animate-required-pop" : "text-accent animate-required-breathe",
              )}
            >
              {valid ? <Check className="size-3.5" strokeWidth={3} /> : <span className="text-[13px]">✦</span>}
            </span>
            <span className="sr-only">{valid ? "(bắt buộc, đã điền)" : "(bắt buộc)"}</span>
          </>
        ) : (
          <span className="text-xs font-normal text-text-secondary">(nếu có)</span>
        )}
      </Tag>
      {hint && <span className="text-xs text-text-secondary">{hint}</span>}
    </div>
  );
}

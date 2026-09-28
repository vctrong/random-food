"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalVariant = "center" | "sheet";

/** Thời gian chờ unmount — phải ≥ duration exit của từng variant bên dưới. */
const TRANSITION_MS: Record<ModalVariant, number> = { center: 220, sheet: 280 };

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Class cho khối panel trắng (vd: max-w-*, padding...). */
  panelClassName?: string;
  showCloseButton?: boolean;
  /**
   * "center": modal giữa màn hình ở mọi kích thước (mặc định).
   * "sheet": bottom sheet trên mobile, modal giữa màn hình từ `sm` trở lên.
   */
  variant?: ModalVariant;
  /** id của tiêu đề trong modal — gắn vào `aria-labelledby`. */
  labelledBy?: string;
  describedBy?: string;
  /** Bỏ nền/bo góc/bóng/cuộn của panel — con tự vẽ bề mặt (vd: modal hướng dẫn). */
  bare?: boolean;
  /** Class cho lớp phủ (thay màu/độ mờ mặc định). */
  overlayClassName?: string;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

/**
 * Modal dùng chung, render qua React Portal thẳng vào `document.body`.
 * BẮT BUỘC dùng portal thay vì chỉ `position: fixed` trong cây component —
 * nếu modal bị lồng trong 1 ancestor có `transform`/`animation` còn giữ
 * transform ở keyframe cuối (vd `.animate-fade-slide-up` ở các card), `fixed`
 * sẽ bị "nhốt" trong ancestor đó thay vì phủ toàn màn hình.
 *
 * A11y: khoá scroll nền, giữ focus (Tab/Shift+Tab) trong panel, focus panel khi
 * mở và trả focus về phần tử đã mở modal khi đóng.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  panelClassName,
  showCloseButton = true,
  variant = "center",
  labelledBy,
  describedBy,
  bare = false,
  overlayClassName,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Đồng bộ trạng thái mount theo prop `isOpen` (nguồn bên ngoài) — cần render
      // ngay để bắt đầu animation enter ở lần render kế tiếp qua requestAnimationFrame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const previousFocus = previousFocusRef.current;
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    previousFocusRef.current = null;
    const timeout = window.setTimeout(() => setMounted(false), TRANSITION_MS[variant]);
    return () => window.clearTimeout(timeout);
  }, [isOpen, variant]);

  // onClose thường là arrow inline ở nơi gọi — giữ qua ref để effect bên dưới chỉ
  // chạy theo `mounted`, không focus lại panel (giật focus khỏi input) mỗi lần re-render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Tôn trọng `autoFocus` của phần tử con (đã được React focus lúc commit).
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted]);

  if (!mounted) return null;

  const isSheet = variant === "sheet";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[1000] flex justify-center transition-[opacity,backdrop-filter] ease-out",
        overlayClassName ?? "bg-text-primary/50",
        isSheet ? "items-end sm:items-center sm:p-4 duration-300" : "items-center p-4 duration-200",
        visible ? "opacity-100 backdrop-blur-sm" : "opacity-0 backdrop-blur-none",
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn(
          "relative w-full outline-none",
          !bare && "bg-surface shadow-2xl",
          isSheet
            ? cn(
                "transition-[opacity,transform]",
                !bare && "max-h-[92svh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl",
                // Mở: ease-out mềm kiểu spring, không nảy; đóng: ease-in nhanh, gọn.
                visible
                  ? "opacity-100 translate-y-0 sm:scale-100 duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : "opacity-0 translate-y-full sm:translate-y-4 sm:scale-[0.96] duration-[240ms] ease-[cubic-bezier(0.4,0,1,1)]",
              )
            : cn(
                "rounded-3xl transition-all duration-200 ease-out",
                visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3",
              ),
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface/90 backdrop-blur-md text-text-secondary hover:text-text-primary flex items-center justify-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

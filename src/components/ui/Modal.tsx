"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const TRANSITION_MS = 220;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Class cho khối panel trắng (vd: max-w-*, padding...). */
  panelClassName?: string;
  showCloseButton?: boolean;
}

/**
 * Modal dùng chung, render qua React Portal thẳng vào `document.body`.
 * BẮT BUỘC dùng portal thay vì chỉ `position: fixed` trong cây component —
 * nếu modal bị lồng trong 1 ancestor có `transform`/`animation` còn giữ
 * transform ở keyframe cuối (vd `.animate-fade-slide-up` ở các card), `fixed`
 * sẽ bị "nhốt" trong ancestor đó thay vì phủ toàn màn hình.
 */
export function Modal({ isOpen, onClose, children, panelClassName, showCloseButton = true }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Đồng bộ trạng thái mount theo prop `isOpen` (nguồn bên ngoài) — cần render
      // ngay để bắt đầu animation enter ở lần render kế tiếp qua requestAnimationFrame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm transition-opacity duration-200 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full bg-surface rounded-3xl shadow-2xl transition-all duration-200 ease-out",
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3",
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface/90 backdrop-blur-md text-text-secondary hover:text-text-primary flex items-center justify-center shadow-sm transition-colors"
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

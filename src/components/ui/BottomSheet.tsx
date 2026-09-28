"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Vùng cố định dưới đáy (nút xác nhận…). */
  footer?: ReactNode;
  /** Chiếm gần hết chiều cao (danh sách dài) thay vì co theo nội dung. */
  tall?: boolean;
  className?: string;
}

const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
const subscribeNoop = () => () => {};
const CLOSE_DRAG_OFFSET = 110;
const CLOSE_DRAG_VELOCITY = 600;

/**
 * Bottom sheet cho mobile: tay kéo ở đầu (kéo xuống để đóng), portal vào body,
 * khoá cuộn nền, giữ focus bên trong, Esc để đóng, trả focus khi đóng.
 * Animation do framer-motion (MotionConfig ở root tôn trọng reduced-motion).
 */
export function BottomSheet({ open, onClose, title, children, footer, tall = false, className }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  // Portal chỉ render sau hydrate (server không có document.body).
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > CLOSE_DRAG_OFFSET || info.velocity.y > CLOSE_DRAG_VELOCITY) onClose();
  }

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1100] flex items-end">
          <motion.div
            className="absolute inset-0 bg-text-primary/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative w-full flex flex-col bg-surface rounded-t-[20px] border-t border-border shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.25)] outline-none",
              tall ? "h-[88svh]" : "max-h-[88svh]",
              className,
            )}
          >
            <div
              className="flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <span aria-hidden className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 pb-3">
              <h2 id={titleId} className="text-base font-heading text-text-primary truncate">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="size-10 -mr-2 shrink-0 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
            {footer && (
              <div className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

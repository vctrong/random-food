"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  /** Dòng mô tả phụ dưới tiêu đề. */
  description?: string;
  /** Ghi đè thời gian hiển thị (ms). Mặc định theo loại — xem TOAST_DURATION_MS. */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  /** Bắn 1 toast dùng chung toàn app, tự ẩn sau vài giây. Mặc định type "success". */
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Lỗi/cảnh báo ở lâu hơn để kịp đọc hết nội dung. */
const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const MAX_VISIBLE_TOASTS = 4;

/** sessionStorage: toast chờ hiển thị ở trang kế tiếp sau 1 lần tải lại toàn trang. */
const PENDING_TOAST_KEY = "nayangi-pending-toast";

// Chỉ dùng token có sẵn (CLAUDE.md 4.3). Chữ luôn là text-primary/text-secondary
// trên bg-surface (đạt AA ở cả 2 theme); màu loại chỉ nằm ở vạch trái + icon.
const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; bar: string; iconWrap: string; label: string }> = {
  success: { icon: CheckCircle2, bar: "bg-success", iconWrap: "bg-success/15 text-success", label: "Thành công" },
  error: { icon: XCircle, bar: "bg-accent-strong", iconWrap: "bg-accent-soft text-accent-ink", label: "Lỗi" },
  warning: {
    icon: AlertTriangle,
    bar: "bg-warning",
    iconWrap: "bg-warning/20 text-secondary-strong dark:text-warning",
    label: "Cảnh báo",
  },
  info: { icon: Info, bar: "bg-primary", iconWrap: "bg-primary-soft text-primary-strong dark:text-primary", label: "Thông tin" },
};

/**
 * Xếp 1 toast để hiện ở trang kế tiếp — dùng khi sắp điều hướng bằng
 * window.location (vd sau đăng nhập), vốn unmount ToastProvider nên toast bắn
 * ngay sẽ mất. Không đọc/ghi được storage (chế độ riêng tư...) thì bỏ qua.
 */
export function queueToastForNextPage(message: string, type: ToastType = "success", options?: ToastOptions) {
  try {
    window.sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify({ message, type, options }));
  } catch {
    // Toast chỉ là phản hồi phụ — mất cũng không ảnh hưởng luồng chính.
  }
}

function readPendingToast(): { message: string; type: ToastType; options?: ToastOptions } | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_TOAST_KEY);
    const parsed = JSON.parse(raw) as { message?: unknown; type?: unknown; options?: ToastOptions };
    if (typeof parsed.message !== "string" || !(typeof parsed.type === "string" && parsed.type in TOAST_STYLES)) return null;
    return { message: parsed.message, type: parsed.type as ToastType, options: parsed.options };
  } catch {
    return null;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Live region đặt cố định trong DOM từ đầu — trình đọc màn hình chỉ đọc
  // chắc chắn khi NỘI DUNG của region có sẵn thay đổi, không phải region mới chèn.
  const [announcement, setAnnouncement] = useState<{ polite: string; assertive: string }>({ polite: "", assertive: "" });
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success", options?: ToastOptions) => {
    const id = nextId.current++;
    const item: ToastItem = {
      id,
      message,
      type,
      description: options?.description,
      duration: options?.duration ?? TOAST_DURATION_MS[type],
    };
    setToasts((prev) => [item, ...prev].slice(0, MAX_VISIBLE_TOASTS));
    const spoken = [TOAST_STYLES[type].label, message, options?.description].filter(Boolean).join(". ");
    setAnnouncement((prev) => (type === "error" ? { ...prev, assertive: spoken } : { ...prev, polite: spoken }));
  }, []);

  useEffect(() => {
    const pending = readPendingToast();
    if (pending) showToast(pending.message, pending.type, pending.options);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement.polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement.assertive}
      </div>
      {/* z-[1100]: phải nổi trên Modal (z-[1000]) — toast bắn từ trong modal không bị backdrop làm mờ. */}
      <section
        aria-label="Thông báo"
        className="fixed z-[1100] top-[calc(var(--header-h)+0.75rem)] inset-x-3 sm:inset-x-auto sm:right-6 sm:w-[380px] flex flex-col gap-2.5 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </section>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { icon: Icon, bar, iconWrap } = TOAST_STYLES[toast.type];
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(toast.duration);

  // Tạm dừng đếm giờ khi hover/focus để người dùng kịp đọc hoặc bấm đóng.
  useEffect(() => {
    if (isPaused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [isPaused, onDismiss, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg dark:shadow-black/40"
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <div className="flex items-start gap-3 py-3.5 pl-5 pr-3">
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-xl", iconWrap)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-snug text-text-primary break-words">{toast.message}</p>
          {toast.description && (
            <p className="mt-0.5 text-sm leading-snug text-text-secondary break-words">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary-soft hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <span
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-70 animate-toast-progress", bar)}
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: isPaused ? "paused" : "running" }}
      />
    </motion.div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() phải được gọi bên trong <ToastProvider>.");
  return ctx;
}

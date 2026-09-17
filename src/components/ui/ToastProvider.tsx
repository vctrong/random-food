"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Bắn 1 toast dùng chung toàn app, tự ẩn sau vài giây. Mặc định type "success". */
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 2800;

const TOAST_ICONS: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: XCircle, className: "text-primary-pink" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  info: { icon: Info, className: "text-primary-blue" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-[60] flex flex-col-reverse gap-2 items-stretch sm:items-end pointer-events-none">
        {toasts.map((toast) => {
          const { icon: Icon, className } = TOAST_ICONS[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl bg-text-primary text-white shadow-2xl"
            >
              <Icon className={cn("size-5 shrink-0", className)} aria-hidden />
              <span className="text-sm">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() phải được gọi bên trong <ToastProvider>.");
  return ctx;
}

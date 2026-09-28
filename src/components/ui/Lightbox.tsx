"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cloudinarySrcSet, cloudinaryWidth } from "@/lib/media/cloudinaryUrl";
import { cn } from "@/lib/utils";

export interface LightboxItem {
  src: string;
  alt: string | null;
}

interface LightboxProps {
  items: LightboxItem[];
  startIndex: number;
  onClose: () => void;
}

const FULL_WIDTHS = [800, 1200, 1600, 2000] as const;
const SWIPE_MIN_PX = 50;

/**
 * Xem ảnh toàn màn hình, không crop: trước/sau (nút, phím ←/→, vuốt ngang trên
 * mobile), số thứ tự, chú thích (alt), đóng bằng Esc / nút X / bấm nền. Giữ focus
 * trong lightbox và trả focus về chỗ cũ khi đóng.
 */
export function Lightbox({ items, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), items.length - 1));
  const [isVisible, setIsVisible] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const count = items.length;
  const current = items[index];
  const hasMany = count > 1;

  const go = useCallback((step: number) => setIndex((value) => (value + step + count) % count), [count]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "ArrowLeft" && hasMany) {
        go(-1);
      } else if (event.key === "ArrowRight" && hasMany) {
        go(1);
      } else if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [go, hasMany]);

  // Tải trước ảnh kế bên để bấm tới/lui không phải chờ.
  useEffect(() => {
    if (!hasMany) return;
    for (const neighbor of [items[(index + 1) % count], items[(index - 1 + count) % count]]) {
      const image = new Image();
      image.src = cloudinaryWidth(neighbor.src, 1600);
    }
  }, [count, hasMany, index, items]);

  function handlePointerDown(event: ReactPointerEvent) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: ReactPointerEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !hasMany) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }

  if (!current) return null;
  const src = cloudinaryWidth(current.src, 1600);
  const isLoaded = loadedSrc === src;
  const controlClass =
    "grid place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={hasMany ? `Xem ảnh ${index + 1} trên ${count}` : "Xem ảnh"}
      className={cn(
        "fixed inset-0 z-[1100] flex flex-col bg-text-primary/95 transition-opacity duration-200 ease-out dark:bg-background/95",
        isVisible ? "opacity-100" : "opacity-0",
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 text-white">
        <span className="text-sm font-semibold tabular-nums" aria-live="polite">
          {hasMany ? `${index + 1}/${count}` : ""}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng (Esc)" className={cn(controlClass, "size-10")}>
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y touch-pinch-zoom select-none items-center justify-center px-2 py-3 sm:px-16"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {!isLoaded && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-white">
            <Spinner />
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary đã transform sẵn, kích thước không biết trước */}
        <img
          key={src}
          src={src}
          srcSet={cloudinarySrcSet(current.src, FULL_WIDTHS)}
          sizes="100vw"
          alt={current.alt ?? ""}
          draggable={false}
          onLoad={() => setLoadedSrc(src)}
          className={cn(
            // Nền sáng ngay sau ảnh: ảnh trong suốt vẫn rõ trên nền tối của lightbox; ảnh
            // thường phủ kín khung nên không thấy nền này.
            "max-h-full max-w-full rounded-lg bg-surface object-contain transition-opacity duration-200 dark:bg-text-primary",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
        />
        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Ảnh trước"
              className={cn(controlClass, "absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 sm:grid")}
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Ảnh sau"
              className={cn(controlClass, "absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 sm:grid")}
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex min-h-14 items-center justify-center gap-3 px-4 pb-5 text-center">
        {hasMany && (
          <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className={cn(controlClass, "size-10 sm:hidden")}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        )}
        <p className="max-w-2xl flex-1 text-sm leading-relaxed text-white/85">{current.alt}</p>
        {hasMany && (
          <button type="button" onClick={() => go(1)} aria-label="Ảnh sau" className={cn(controlClass, "size-10 sm:hidden")}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

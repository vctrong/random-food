"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

const MOBILE_QUERY = "(max-width: 639px)";
/** Chừa chỗ cho header nổi cố định ở đầu trang (~72px) để popover lật lên không đè lên header. */
const VIEWPORT_PADDING = { top: 88, right: 12, bottom: 12, left: 12 };

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** true dưới breakpoint `sm` — danh sách dài chuyển sang bottom sheet thay vì dropdown nhỏ. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}

export interface PickerTriggerProps {
  ref: Ref<HTMLElement>;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  onClick: () => void;
}

interface ResponsivePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tiêu đề bottom sheet + nhãn a11y của popover. */
  title: string;
  trigger: (props: PickerTriggerProps) => ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Chiều rộng tối thiểu của popover (trigger nhỏ như chip). Mặc định khớp đúng chiều rộng trigger. */
  minWidth?: number;
  maxHeight?: number;
  /** Bottom sheet cao cố định (danh sách dài có ô tìm kiếm). */
  tallSheet?: boolean;
  /** Trigger nằm sát mép phải (vd nút "⋯") thì dùng "bottom-end" để popover mở về bên trái. */
  align?: "start" | "end";
}

/**
 * Popover (desktop) / bottom sheet (mobile) dùng chung cho mọi danh sách chọn.
 * Popover render qua portal nên không bị cắt bởi overflow của card; tự lật lên
 * trên khi gần mép dưới (flip), không tràn mép ngang (shift), rộng khớp trigger,
 * cao tối đa theo khoảng trống còn lại (size), bám theo khi scroll/resize (autoUpdate).
 * Đóng khi click ra ngoài/Esc; focus vào phần tử đầu tiên (ô tìm kiếm) khi mở.
 */
export function ResponsivePicker({
  open,
  onOpenChange,
  title,
  trigger,
  children,
  footer,
  minWidth = 0,
  maxHeight = 420,
  tallSheet = false,
  align = "start",
}: ResponsivePickerProps) {
  const isMobile = useIsMobile();
  const desktopOpen = open && !isMobile;

  // Dùng state làm callback ref (không đọc `refs` của floating-ui trong lúc render).
  const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
  const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);
  const { floatingStyles, context, isPositioned, update } = useFloating({
    elements: { reference: referenceEl, floating: floatingEl },
    open: desktopOpen,
    onOpenChange,
    placement: align === "end" ? "bottom-end" : "bottom-start",
    // fixed: vị trí tạm (0,0) trước khi tính xong nằm trong viewport → focus không làm trang cuộn.
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: VIEWPORT_PADDING, fallbackPlacements: [align === "end" ? "top-end" : "top-start"] }),
      shift({ padding: VIEWPORT_PADDING }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ rects, availableHeight, availableWidth, elements }) {
          const width = Math.min(Math.max(rects.reference.width, minWidth), availableWidth);
          Object.assign(elements.floating.style, {
            width: `${width}px`,
            maxHeight: `${Math.max(180, Math.min(availableHeight, maxHeight))}px`,
          });
        },
        // floating-ui so sánh hàm `apply` theo toString nên phải khai deps, nếu không
        // minWidth mới (vd menu "⋯" chuyển sang form) sẽ bị bỏ qua.
      }, [minWidth, maxHeight]),
    ],
  });

  // Nội dung đổi kích thước (vd menu "⋯" chuyển sang form) → tính lại vị trí/độ rộng ngay.
  useEffect(() => {
    if (desktopOpen) update();
  }, [desktopOpen, minWidth, maxHeight, update]);

  // Focus phần tử đầu tiên (ô tìm kiếm / listbox) chỉ SAU KHI đã định vị — focus sớm hơn sẽ kéo trang cuộn.
  useEffect(() => {
    if (!desktopOpen || !isPositioned || !floatingEl) return;
    const target = floatingEl.querySelector<HTMLElement>("input, [role='listbox'][tabindex], button");
    target?.focus({ preventScroll: true });
  }, [desktopOpen, isPositioned, floatingEl]);

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getFloatingProps } = useInteractions([dismiss, role]);
  const { isMounted, styles } = useTransitionStyles(context, {
    duration: { open: 170, close: 130 },
    initial: { opacity: 0, transform: "scale(0.97)" },
    common: ({ side }) => ({
      transformOrigin: `${side === "top" ? "bottom" : "top"} ${align === "end" ? "right" : "left"}`,
    }),
  });

  return (
    <>
      {trigger({
        ref: setReferenceEl,
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        onClick: () => onOpenChange(!open),
      })}

      {isMobile ? (
        <BottomSheet open={open} onClose={() => onOpenChange(false)} title={title} footer={footer} tall={tallSheet}>
          {children}
        </BottomSheet>
      ) : (
        isMounted && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
              <div
                ref={setFloatingEl}
                aria-label={title}
                style={floatingStyles}
                className="z-[1050]"
                {...getFloatingProps()}
              >
                <div
                  style={styles}
                  className={cn(
                    "flex flex-col h-full max-h-[inherit] overflow-hidden rounded-2xl border border-border bg-surface",
                    "shadow-[0_12px_32px_-12px_rgb(15_23_42/0.22),0_2px_6px_-2px_rgb(15_23_42/0.08)]",
                  )}
                >
                  <div className="flex-1 min-h-0 flex flex-col">{children}</div>
                  {footer && <div className="border-t border-border p-3">{footer}</div>}
                </div>
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        )
      )}
    </>
  );
}

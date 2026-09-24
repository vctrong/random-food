"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { FloatingSticker, StickerDepth } from "@/constants/landingStickers";
import { useStrictReducedMotion } from "@/features/random-food/useStrictReducedMotion";
import { cn } from "@/lib/utils";

/** Độ dịch theo chuột (px) và hệ số parallax cuộn cho từng lớp độ sâu. */
const DEPTH_STYLE: Record<StickerDepth, { mouse: string; scroll: number; opacity: number }> = {
  1: { mouse: "6px", scroll: 0.03, opacity: 0.6 },
  2: { mouse: "14px", scroll: 0.07, opacity: 0.8 },
  3: { mouse: "26px", scroll: 0.12, opacity: 0.95 },
};

/** Sticker bị hút về điểm hút một đoạn = 16% khoảng cách hiện tại. */
const PULL_RATIO = 0.16;
const MOUSE_PARALLAX_QUERY = "(min-width: 1024px) and (pointer: fine)";

interface FloatingFoodStickersProps {
  stickers: FloatingSticker[];
  /** true khi máy đang quay: sticker bị hút về `attractTo` và rung lên. */
  agitated?: boolean;
  /** Điểm hút (% khung chứa), mặc định tâm khung. */
  attractTo?: { x: number; y: number };
  className?: string;
}

/**
 * Lớp sticker đồ ăn trang trí, nằm tuyệt đối trong khung cha (cha phải `relative`,
 * nội dung chính cần z-index cao hơn). Parallax ghi thẳng vào biến CSS của khung
 * bằng rAF — không setState mỗi frame.
 */
export function FloatingFoodStickers({
  stickers,
  agitated = false,
  attractTo = { x: 50, y: 50 },
  className,
}: FloatingFoodStickersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useStrictReducedMotion();
  const isAgitated = agitated && !reducedMotion;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      node.style.setProperty("--cw", `${entry.contentRect.width}px`);
      node.style.setProperty("--ch", `${entry.contentRect.height}px`);
    });
    resizeObserver.observe(node);

    if (reducedMotion) {
      node.style.setProperty("--mx", "0");
      node.style.setProperty("--my", "0");
      node.style.setProperty("--sy", "0px");
      return () => resizeObserver.disconnect();
    }

    let frame = 0;
    let isInView = true;
    let pointer: { x: number; y: number } | null = null;
    const mouseQuery = window.matchMedia(MOUSE_PARALLAX_QUERY);

    const render = () => {
      frame = 0;
      if (pointer && mouseQuery.matches) {
        node.style.setProperty("--mx", ((pointer.x / window.innerWidth - 0.5) * -2).toFixed(3));
        node.style.setProperty("--my", ((pointer.y / window.innerHeight - 0.5) * -2).toFixed(3));
      } else {
        node.style.setProperty("--mx", "0");
        node.style.setProperty("--my", "0");
      }
      const scrolledPast = Math.min(Math.max(-node.getBoundingClientRect().top, -400), 1200);
      node.style.setProperty("--sy", `${scrolledPast.toFixed(1)}px`);
    };
    const schedule = () => {
      if (!frame && isInView) frame = requestAnimationFrame(render);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      schedule();
    });
    intersectionObserver.observe(node);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    mouseQuery.addEventListener("change", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
      mouseQuery.removeEventListener("change", schedule);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
    >
      {stickers.map((sticker) => {
        const depth = DEPTH_STYLE[sticker.depth];
        const mobile = sticker.mobile;
        const style = {
          "--x": `${sticker.x}%`,
          "--y": `${sticker.y}%`,
          "--size": `${sticker.size}rem`,
          "--xm": `${mobile?.x ?? sticker.x}%`,
          "--ym": `${mobile?.y ?? sticker.y}%`,
          "--size-m": `${mobile?.size ?? sticker.size}rem`,
          "--dx": ((attractTo.x - sticker.x) / 100) * PULL_RATIO,
          "--dy": ((attractTo.y - sticker.y) / 100) * PULL_RATIO,
          "--dxm": ((attractTo.x - (mobile?.x ?? sticker.x)) / 100) * PULL_RATIO,
          "--dym": ((attractTo.y - (mobile?.y ?? sticker.y)) / 100) * PULL_RATIO,
          "--depth-mouse": depth.mouse,
          "--depth-scroll": depth.scroll,
          opacity: depth.opacity,
          transform:
            "translate(-50%, -50%) translate3d(calc(var(--mx, 0) * var(--depth-mouse)), calc(var(--my, 0) * var(--depth-mouse) + var(--sy, 0px) * var(--depth-scroll)), 0)",
        } as CSSProperties;

        return (
          <div
            key={sticker.id}
            style={style}
            className={cn(
              "absolute left-(--xm) top-(--ym) text-(length:--size-m) leading-none [--pdx:var(--dxm)] [--pdy:var(--dym)]",
              "lg:left-(--x) lg:top-(--y) lg:text-(length:--size) lg:[--pdx:var(--dx)] lg:[--pdy:var(--dy)]",
              "transition-transform duration-300 ease-out",
              !mobile && "hidden lg:block",
            )}
          >
            <div
              className={cn(
                "transition-transform",
                isAgitated ? "duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" : "duration-1000 ease-[cubic-bezier(0.34,1.3,0.64,1)]",
              )}
              style={{
                transform: isAgitated
                  ? "translate(calc(var(--pdx) * var(--cw, 0px)), calc(var(--pdy) * var(--ch, 0px))) scale(0.92)"
                  : "none",
              }}
            >
              <div
                className="animate-sticker-float"
                style={
                  {
                    "--float-y": `${sticker.floatY}px`,
                    "--float-rot": `${sticker.floatRotate}deg`,
                    "--float-duration": `${sticker.duration}s`,
                    "--float-delay": `${sticker.delay}s`,
                  } as CSSProperties
                }
              >
                <div className={cn(isAgitated && "animate-sticker-jiggle")}>
                  <span
                    className="inline-block drop-shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:pointer-events-auto lg:hover:-translate-y-2 lg:hover:scale-125"
                    style={{ rotate: `${sticker.rotate}deg` }}
                  >
                    {sticker.emoji}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, ChevronDown, Layers, Trash2 } from "lucide-react";
import { buildGroupTitle, buildNotificationContent } from "@/features/notifications/notificationContent";
import type { NotificationGroup } from "@/features/notifications/groupNotifications";
import { cn, formatRelativeTime } from "@/lib/utils";
import { NOTIFICATION_ICONS, NOTIFICATION_TONE_CLASSES } from "./notificationVisuals";

/** Kéo quá ngưỡng này (px) thì thực hiện hành động vuốt. */
const SWIPE_THRESHOLD = 96;
/** Vuốt chỉ bật dưới breakpoint md — desktop dùng nút, tránh kéo chuột lỡ tay xoá. */
const SWIPE_QUERY = "(max-width: 767px)";

function subscribeSwipeQuery(onChange: () => void) {
  const media = window.matchMedia(SWIPE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useSwipeEnabled(): boolean {
  return useSyncExternalStore(subscribeSwipeQuery, () => window.matchMedia(SWIPE_QUERY).matches, () => false);
}

interface NotificationCardProps {
  group: NotificationGroup;
  /** compact: dòng trong dropdown chuông; full: thẻ trong trang /thong-bao (có nút + vuốt). */
  variant: "compact" | "full";
  onMarkRead: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  /** Gọi sau khi điều hướng (vd đóng dropdown). */
  onNavigate?: () => void;
}

export function NotificationCard({ group, variant, onMarkRead, onDelete, onNavigate }: NotificationCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const first = group.items[0];
  const isGroup = group.items.length > 1;
  const content = buildNotificationContent(first.type, first.payload);
  const Icon = isGroup ? Layers : NOTIFICATION_ICONS[content.icon];
  const title = isGroup ? buildGroupTitle(group.type, group.items.length) : content.title;
  const isFull = variant === "full";

  function open() {
    // Nhóm: bấm chỉ mở/thu gọn — từng mục bên trong mới đánh dấu đã đọc riêng.
    if (isGroup) {
      setIsExpanded((value) => !value);
      return;
    }
    if (!first.isRead) onMarkRead([first.id]);
    if (first.link) {
      router.push(first.link);
      onNavigate?.();
    }
  }

  const body = (
    <div
      className={cn(
        "group relative flex gap-3 text-left transition-colors",
        isFull ? "rounded-2xl border p-4" : "rounded-xl p-3",
        isFull && (group.isRead ? "border-border bg-surface" : "border-primary-line bg-primary-soft/40"),
        !isFull && (group.isRead ? "hover:bg-background" : "bg-primary-soft/50 hover:bg-primary-soft"),
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-xl",
          isFull ? "size-11" : "size-9",
          NOTIFICATION_TONE_CLASSES[content.tone],
        )}
      >
        <Icon className={isFull ? "size-5" : "size-4.5"} />
      </span>

      <div className="min-w-0 flex-1">
        {/* Cả vùng chữ là 1 nút — bàn phím/trình đọc màn hình dùng được như bấm vào thẻ. */}
        <button
          type="button"
          onClick={open}
          aria-expanded={isGroup ? isExpanded : undefined}
          className="block w-full text-left after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
        >
          <span className={cn("block text-text-primary", isFull ? "text-[15px]" : "text-sm", group.isRead ? "font-medium" : "font-semibold")}>
            {title}
          </span>
        </button>
        {!isGroup && content.body && (
          <p className={cn("mt-0.5 text-text-secondary", isFull ? "text-sm" : "text-xs line-clamp-2")}>{content.body}</p>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
          <time dateTime={group.createdAt}>{formatRelativeTime(group.createdAt)}</time>
          {isGroup && (
            <>
              {group.unreadCount > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-accent-ink">{group.unreadCount} chưa đọc</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5">
                {isExpanded ? "Thu gọn" : `Xem ${group.items.length} mục`}
                <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} aria-hidden />
              </span>
            </>
          )}
        </p>

        {isFull && !isGroup && first.link && content.actionLabel && (
          <Link
            href={first.link}
            onClick={() => !group.isRead && onMarkRead(group.ids)}
            className={cn(
              "relative z-10 mt-3 inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors",
              content.tone === "accent"
                ? "bg-accent-strong text-white hover:bg-accent-strong-hover"
                : "border border-primary-line text-primary-strong hover:bg-primary-soft dark:text-primary",
            )}
          >
            {content.actionLabel}
          </Link>
        )}

        <AnimatePresence initial={false}>
          {isGroup && isExpanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 mt-2 overflow-hidden border-l-2 border-primary-line pl-3"
            >
              {group.items.map((item) => {
                const itemContent = buildNotificationContent(item.type, item.payload);
                const markThis = () => {
                  if (!item.isRead) onMarkRead([item.id]);
                };
                const itemClass = cn(
                  "flex w-full items-start gap-2 rounded-lg py-1.5 text-left text-sm transition-colors hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-primary",
                  item.isRead ? "text-text-secondary" : "font-semibold text-text-primary",
                );
                const label = (
                  <>
                    <span
                      aria-hidden
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.isRead ? "bg-border" : "bg-accent-strong")}
                    />
                    <span className="min-w-0 flex-1">
                      {itemContent.title}
                      {!item.isRead && <span className="sr-only"> (chưa đọc)</span>}
                    </span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link
                        href={item.link}
                        onClick={() => {
                          markThis();
                          onNavigate?.();
                        }}
                        className={itemClass}
                      >
                        {label}
                      </Link>
                    ) : (
                      <button type="button" onClick={markThis} className={itemClass}>
                        {label}
                      </button>
                    )}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {!group.isRead && <span className="mt-1.5 size-2.5 rounded-full bg-accent-strong" aria-label="Chưa đọc" />}
        {isFull && (
          // Mobile dùng vuốt; nút vẫn còn cho trình đọc màn hình (max-md:sr-only).
          <div className="relative z-10 flex gap-1 max-md:sr-only md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            {!group.isRead && (
              <button
                type="button"
                onClick={() => onMarkRead(group.ids)}
                aria-label={isGroup ? "Đánh dấu cả nhóm đã đọc" : "Đánh dấu đã đọc"}
                title={isGroup ? "Đánh dấu cả nhóm đã đọc" : "Đánh dấu đã đọc"}
                className="grid size-8 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-primary-soft hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:text-primary"
              >
                <Check className="size-4" aria-hidden />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(group.ids)}
                aria-label="Xoá thông báo"
                title="Xoá thông báo"
                className="grid size-8 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-accent-soft hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!isFull || !onDelete) return body;
  return (
    <SwipeActions isRead={group.isRead} onSwipeRight={() => onMarkRead(group.ids)} onSwipeLeft={() => onDelete(group.ids)}>
      {body}
    </SwipeActions>
  );
}

/** Vuốt phải = đã đọc, vuốt trái = xoá (chỉ mobile — md trở lên tắt kéo). */
function SwipeActions({
  children,
  isRead,
  onSwipeRight,
  onSwipeLeft,
}: {
  children: ReactNode;
  isRead: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const isSwipeEnabled = useSwipeEnabled();
  const x = useMotionValue(0);
  const readOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD && !isRead) onSwipeRight();
    else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeLeft();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        aria-hidden
        style={{ opacity: readOpacity }}
        className="absolute inset-0 flex items-center rounded-2xl bg-primary-soft pl-5 text-sm font-semibold text-primary-strong dark:text-primary md:hidden"
      >
        <Check className="mr-1.5 size-4" /> {isRead ? "Đã đọc rồi" : "Đã đọc"}
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-2xl bg-accent-soft pr-5 text-sm font-semibold text-accent-ink md:hidden"
      >
        Xoá <Trash2 className="ml-1.5 size-4" />
      </motion.div>
      <motion.div
        drag={isSwipeEnabled ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative touch-pan-y bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}

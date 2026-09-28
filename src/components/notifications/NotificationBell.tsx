"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, CheckCheck, Megaphone } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsMobile } from "@/components/ui/ResponsivePicker";
import { groupNotifications } from "@/features/notifications/groupNotifications";
import { cn } from "@/lib/utils";
import { useNotificationCenter } from "./NotificationCenterProvider";
import { NotificationCard } from "./NotificationCard";

/** Số dòng (sau khi gộp) hiện trong dropdown. */
const MAX_ROWS = 10;

function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Chuông trên header — chỉ render khi đã đăng nhập. */
export function NotificationBell({ className }: { className?: string }) {
  const center = useNotificationCenter();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const total = center.unread?.total ?? 0;

  useEffect(() => {
    if (!isOpen || isMobile) return;
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, isMobile]);

  if (!center.isAuthenticated) return null;

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) void center.loadRecent();
  }

  const close = () => setIsOpen(false);
  const label = total > 0 ? `Thông báo, ${total} chưa đọc` : "Thông báo";

  const panelBody = <BellPanelBody onNavigate={close} />;
  const panelFooter = (
    <Link
      href="/thong-bao"
      onClick={close}
      className="flex h-11 w-full items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-line/60 dark:text-primary"
    >
      Xem tất cả thông báo
    </Link>
  );

  return (
    <div ref={containerRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={isMobile ? undefined : panelId}
        className={cn(
          "relative grid size-10 place-items-center rounded-full border bg-surface text-text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary max-lg:size-11",
          isOpen ? "border-primary bg-primary-soft" : "border-border",
        )}
      >
        {/* key theo pulse → mỗi thông báo mới chạy lại animation lắc (MotionConfig tôn trọng reduced-motion). */}
        <motion.span
          key={center.pulse}
          aria-hidden
          initial={false}
          animate={center.pulse > 0 ? { rotate: [0, -16, 14, -10, 6, 0] } : undefined}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ originY: 0.15 }}
          className="grid place-items-center"
        >
          {total > 0 ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        </motion.span>
        <AnimatePresence>
          {total > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              aria-hidden
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-surface bg-accent-strong px-1 text-[11px] font-bold leading-none text-white tabular-nums"
            >
              {formatBadge(total)}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isMobile ? (
        <BottomSheet open={isOpen} onClose={close} title="Thông báo" footer={panelFooter} tall>
          <div className="mb-2 flex justify-end empty:hidden">
            <MarkAllReadButton />
          </div>
          {panelBody}
        </BottomSheet>
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={panelId}
              role="dialog"
              aria-label="Thông báo"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full z-50 mt-2 flex w-[400px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl dark:shadow-black/40"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <BellPanelTitle />
              </div>
              <div className="max-h-[min(460px,65vh)] overflow-y-auto p-2">{panelBody}</div>
              <div className="border-t border-border p-3">{panelFooter}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function BellPanelTitle() {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <h2 className="font-heading text-lg text-text-primary">Thông báo</h2>
      <MarkAllReadButton />
    </div>
  );
}

function MarkAllReadButton() {
  const center = useNotificationCenter();
  if ((center.unread?.total ?? 0) === 0) return null;
  return (
    <button
      type="button"
      onClick={() => void center.markAllRead()}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft dark:text-primary"
    >
      <CheckCheck className="size-4" aria-hidden />
      Đánh dấu đã đọc hết
    </button>
  );
}

function BellPanelBody({ onNavigate }: { onNavigate: () => void }) {
  const center = useNotificationCenter();
  const announcements = center.announcements ?? [];
  const groups = center.recent ? groupNotifications(center.recent).slice(0, Math.max(0, MAX_ROWS - announcements.length)) : null;

  if (!groups && center.isLoadingRecent) return <NotificationSkeleton rows={4} compact />;
  if ((!groups || groups.length === 0) && announcements.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-strong dark:text-primary">
          <Bell className="size-6" aria-hidden />
        </span>
        <p className="font-heading text-base text-text-primary">Chưa có gì mới nè</p>
        <p className="mt-1 text-sm text-text-secondary">Món bạn góp được duyệt hay có tin gì hay, tui báo bạn liền nha.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {announcements.map((announcement) => (
        <li key={`announcement-${announcement.id}`}>
          <Link
            href={`/tin-tuc/${announcement.slug}`}
            onClick={() => {
              void center.markAnnouncementRead(announcement.id);
              onNavigate();
            }}
            className="flex gap-3 rounded-xl bg-accent-soft/60 p-3 transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
              <Megaphone className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-accent-ink">Thông báo chính thức</span>
              <span className="block text-sm font-semibold text-text-primary">{announcement.title}</span>
              <span className="mt-0.5 block line-clamp-2 text-xs text-text-secondary">{announcement.summary}</span>
            </span>
          </Link>
        </li>
      ))}
      {(groups ?? []).map((group) => (
        <li key={group.key}>
          <NotificationCard group={group} variant="compact" onMarkRead={(ids) => void center.markRead(ids)} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}

export function NotificationSkeleton({ rows, compact = false }: { rows: number; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Đang tải thông báo">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn("flex gap-3", compact ? "p-3" : "rounded-2xl border border-border bg-surface p-4")}>
          <span className={cn("shrink-0 animate-pulse rounded-xl bg-primary-soft", compact ? "size-9" : "size-11")} />
          <div className="flex-1 space-y-2 pt-1">
            <span className="block h-3.5 w-4/5 animate-pulse rounded-full bg-border" />
            <span className="block h-3 w-2/5 animate-pulse rounded-full bg-border/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, ChefHat, Hand, PartyPopper, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { groupNotifications, sectionGroups, TIME_SECTION_LABELS } from "@/features/notifications/groupNotifications";
import { getNotifications } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";
import { useNotificationCenter } from "./NotificationCenterProvider";
import { NotificationCard } from "./NotificationCard";
import { NotificationSkeleton } from "./NotificationBell";

type Filter = "all" | "unread";

const PAGE_SIZE = 20;

export function NotificationsPageContent() {
  const center = useNotificationCenter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadFirstPage = useCallback((target: Filter) => {
    const requestId = ++requestRef.current;
    return getNotifications({ limit: PAGE_SIZE, unreadOnly: target === "unread" }).then((result) => {
      // Bỏ kết quả cũ nếu người dùng đã đổi tab trong lúc chờ.
      if (requestId !== requestRef.current) return;
      if (!result.ok) {
        setLoadError(result.message);
        setItems((current) => current ?? []);
        return;
      }
      setLoadError(null);
      setItems(result.data.items);
      setNextCursor(result.data.nextCursor);
    });
  }, []);

  // Tải lại trang đầu khi đổi tab hoặc có tín hiệu mới/kết nối lại (syncVersion).
  useEffect(() => {
    void loadFirstPage(filter);
  }, [filter, center.syncVersion, loadFirstPage]);

  function changeFilter(next: Filter) {
    if (next === filter) return;
    setItems(null);
    setFilter(next);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    const result = await getNotifications({ limit: PAGE_SIZE, unreadOnly: filter === "unread", cursor: nextCursor });
    setIsLoadingMore(false);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    setItems((current) => [...(current ?? []), ...result.data.items]);
    setNextCursor(result.data.nextCursor);
  }

  function markRead(ids: string[]) {
    setItems((current) => current?.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item)) ?? null);
    void center.markRead(ids);
  }

  async function markAllRead() {
    setItems((current) => current?.map((item) => ({ ...item, isRead: true })) ?? null);
    const ok = await center.markAllRead();
    showToast(ok ? "Đã đánh dấu đọc hết rồi nha" : "Chưa đánh dấu được, bạn thử lại nhé", ok ? "success" : "error");
  }

  async function remove(ids: string[]) {
    setItems((current) => current?.filter((item) => !ids.includes(item.id)) ?? null);
    const ok = await center.remove(ids);
    if (!ok) {
      showToast("Chưa xoá được thông báo, bạn thử lại nhé", "error");
      void loadFirstPage(filter);
    }
  }

  const sections = useMemo(() => (items ? sectionGroups(groupNotifications(items)) : []), [items]);
  const unreadCount = center.unread?.notifications ?? 0;
  const hasUnreadInList = items?.some((item) => !item.isRead) ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Bell className="size-4" aria-hidden />
            <span>Hộp thông báo</span>
          </div>
          <h1 className="text-3xl text-text-primary md:text-4xl">Thông báo</h1>
          <p className="mt-1 text-text-secondary">Cập nhật về đóng góp, báo cáo và tài khoản của bạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/cai-dat#thong-bao"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-line hover:text-text-primary"
          >
            <Settings2 className="size-4" aria-hidden />
            Tuỳ chọn email
          </Link>
          {(unreadCount > 0 || hasUnreadInList) && (
            <Button size="sm" variant="outline" leftIcon={<CheckCheck className="size-4" />} onClick={markAllRead}>
              Đánh dấu đã đọc hết
            </Button>
          )}
        </div>
      </header>

      <div role="tablist" aria-label="Lọc thông báo" className="mb-6 inline-flex rounded-full border border-border bg-surface p-1">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => changeFilter(value)}
            className={cn(
              "relative isolate inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              filter === value ? "text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {filter === value && (
              <motion.span
                layoutId="notification-filter-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary-strong"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {value === "all" ? "Tất cả" : "Chưa đọc"}
            {value === "unread" && unreadCount > 0 && (
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  filter === value ? "bg-white/20 text-white" : "bg-accent-soft text-accent-ink",
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loadError && items?.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-text-primary">{loadError}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => void loadFirstPage(filter)}>
            Thử lại
          </Button>
        </div>
      ) : items === null ? (
        <NotificationSkeleton rows={5} />
      ) : sections.length === 0 ? (
        <EmptyInbox filter={filter} />
      ) : (
        <>
          <p className="mb-4 flex items-center gap-1.5 text-xs text-text-secondary md:hidden">
            <Hand className="size-3.5" aria-hidden />
            Vuốt phải để đánh dấu đã đọc, vuốt trái để xoá.
          </p>
          <div className="flex flex-col gap-8">
            {sections.map(({ section, groups }) => (
              <section key={section} aria-labelledby={`notification-section-${section}`}>
                <h2 id={`notification-section-${section}`} className="mb-3 text-sm uppercase tracking-wider text-text-secondary">
                  {TIME_SECTION_LABELS[section]}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {groups.map((group) => (
                      <motion.li
                        key={group.key}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <NotificationCard group={group} variant="full" onMarkRead={markRead} onDelete={(ids) => void remove(ids)} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={loadMore} isLoading={isLoadingMore}>
                Tải thêm thông báo cũ hơn
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyInbox({ filter }: { filter: Filter }) {
  const isUnread = filter === "unread";
  const Icon = isUnread ? PartyPopper : Bell;
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-primary-line bg-surface px-6 py-14 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-strong dark:text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="text-xl text-text-primary">{isUnread ? "Đọc hết rồi, giỏi ghê!" : "Hộp thông báo còn trống trơn"}</h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        {isUnread
          ? "Không còn thông báo nào chưa đọc. Có tin mới là tui báo bạn liền nha."
          : "Khi món bạn góp được duyệt hay có tin gì mới, tui sẽ báo ở đây liền nha 🍜"}
      </p>
      {!isUnread && (
        <Link
          href="/mon-an/dong-gop"
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-strong px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover"
        >
          <ChefHat className="size-4" aria-hidden />
          Góp một món ngon
        </Link>
      )}
    </div>
  );
}

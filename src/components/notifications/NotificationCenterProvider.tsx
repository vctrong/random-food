"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast, type ToastType } from "@/components/ui/ToastProvider";
import { buildNotificationContent, type NotificationTone } from "@/features/notifications/notificationContent";
import { useRealtimeNotifications, type NotificationSignal, type RealtimeMode } from "@/features/notifications/useRealtimeNotifications";
import {
  deleteNotifications,
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/services/notificationService";
import {
  getUnseenAnnouncements,
  markAllAnnouncementsRead,
  markAnnouncementRead as markAnnouncementReadRequest,
} from "@/services/announcementService";
import type { NotificationItem, UnreadCountResponse } from "@/types/notification";
import type { AnnouncementSummary } from "@/types/announcement";

/** Số thông báo lấy cho dropdown chuông (gộp xong còn khoảng 10 dòng). */
const RECENT_LIMIT = 12;

const TOAST_TYPE_BY_TONE: Record<NotificationTone, ToastType> = {
  primary: "info",
  accent: "info",
  secondary: "info",
  success: "success",
  warning: "warning",
};

interface NotificationCenterValue {
  isAuthenticated: boolean;
  unread: UnreadCountResponse | null;
  recent: NotificationItem[] | null;
  /** Thông báo chính thức chưa xem — hiện đầu dropdown chuông. */
  announcements: AnnouncementSummary[] | null;
  isLoadingRecent: boolean;
  /** Tăng mỗi khi có thông báo mới → chuông lắc. */
  pulse: number;
  /** Tăng mỗi khi cần đồng bộ lại (tín hiệu mới / kết nối lại) → trang /thong-bao tải lại trang đầu. */
  syncVersion: number;
  mode: RealtimeMode;
  loadRecent: () => Promise<NotificationItem[] | null>;
  refreshCount: () => Promise<void>;
  markRead: (ids: string[]) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  remove: (ids: string[]) => Promise<boolean>;
  /** Bấm/mở 1 thông báo chính thức → CHỈ bài đó là đã đọc, rời khỏi dropdown. */
  markAnnouncementRead: (id: string) => Promise<void>;
}

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = status === "authenticated" ? ((session?.user as { id?: string } | undefined)?.id ?? null) : null;
  const pathname = usePathname();
  const { showToast } = useToast();

  const [unread, setUnread] = useState<UnreadCountResponse | null>(null);
  const [recent, setRecent] = useState<NotificationItem[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[] | null>(null);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const lastTotalRef = useRef<number | null>(null);
  const recentLoadedRef = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const refreshCount = useCallback(async () => {
    const result = await getUnreadCount();
    if (!result.ok) return;
    const previous = lastTotalRef.current;
    lastTotalRef.current = result.data.total;
    // Polling phát hiện có mới (không qua realtime) cũng lắc chuông.
    if (previous !== null && result.data.total > previous) setPulse((value) => value + 1);
    setUnread(result.data);
  }, []);

  const loadRecent = useCallback(async () => {
    setIsLoadingRecent(true);
    const [result, unseen] = await Promise.all([getNotifications({ limit: RECENT_LIMIT }), getUnseenAnnouncements()]);
    setIsLoadingRecent(false);
    if (unseen.ok) setAnnouncements(unseen.data);
    if (!result.ok) return null;
    recentLoadedRef.current = true;
    setRecent(result.data.items);
    return result.data.items;
  }, []);

  const resync = useCallback(() => {
    void refreshCount();
    if (recentLoadedRef.current) void loadRecent();
    setSyncVersion((value) => value + 1);
  }, [refreshCount, loadRecent]);

  const handleSignal = useCallback(
    async (signal: NotificationSignal) => {
      setPulse((value) => value + 1);
      setSyncVersion((value) => value + 1);
      const [items] = await Promise.all([loadRecent(), refreshCount()]);
      // Đang ở trang thông báo thì danh sách tự cập nhật, không cần toast.
      if (pathnameRef.current === "/thong-bao") return;
      const item = items?.find((entry) => entry.id === signal.id);
      if (!item) return;
      const content = buildNotificationContent(item.type, item.payload);
      showToast(content.title, TOAST_TYPE_BY_TONE[content.tone], {
        description: content.body ?? undefined,
        action: item.link
          ? { label: content.actionLabel ?? "Xem chi tiết", href: item.link }
          : { label: "Xem thông báo", href: "/thong-bao" },
      });
    },
    [loadRecent, refreshCount, showToast],
  );

  const mode = useRealtimeNotifications({ userId, onNotification: handleSignal, onResync: resync });

  // Đăng nhập (hoặc đổi tài khoản) → đếm lại; đăng xuất → xoá sạch dữ liệu của phiên trước.
  useEffect(() => {
    lastTotalRef.current = null;
    recentLoadedRef.current = false;
    if (!userId) return;
    const timer = window.setTimeout(() => void refreshCount(), 0);
    return () => window.clearTimeout(timer);
  }, [userId, refreshCount]);

  const applyLocalRead = useCallback((ids: string[] | "all") => {
    setRecent((items) => items?.map((item) => (ids === "all" || ids.includes(item.id) ? { ...item, isRead: true } : item)) ?? null);
  }, []);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return true;
      applyLocalRead(ids);
      const result = await markNotificationsRead({ ids });
      void refreshCount();
      return result.ok;
    },
    [applyLocalRead, refreshCount],
  );

  const markAllRead = useCallback(async () => {
    applyLocalRead("all");
    setAnnouncements([]);
    const [result] = await Promise.all([markNotificationsRead({ all: true }), markAllAnnouncementsRead()]);
    void refreshCount();
    return result.ok;
  }, [applyLocalRead, refreshCount]);

  const markAnnouncementRead = useCallback(
    async (id: string) => {
      setAnnouncements((items) => items?.filter((item) => item.id !== id) ?? null);
      const result = await markAnnouncementReadRequest(id);
      if (result.ok) void refreshCount();
    },
    [refreshCount],
  );

  const remove = useCallback(
    async (ids: string[]) => {
      setRecent((items) => items?.filter((item) => !ids.includes(item.id)) ?? null);
      const result = await deleteNotifications(ids);
      void refreshCount();
      return result.ok;
    },
    [refreshCount],
  );

  const value = useMemo<NotificationCenterValue>(
    () => ({
      isAuthenticated: Boolean(userId),
      unread: userId ? unread : null,
      recent: userId ? recent : null,
      announcements: userId ? announcements : null,
      isLoadingRecent,
      pulse,
      syncVersion,
      mode,
      loadRecent,
      refreshCount,
      markRead,
      markAllRead,
      remove,
      markAnnouncementRead,
    }),
    [
      userId,
      unread,
      recent,
      announcements,
      isLoadingRecent,
      pulse,
      syncVersion,
      mode,
      loadRecent,
      refreshCount,
      markRead,
      markAllRead,
      remove,
      markAnnouncementRead,
    ],
  );

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter(): NotificationCenterValue {
  const context = useContext(NotificationCenterContext);
  if (!context) throw new Error("useNotificationCenter() phải được gọi bên trong <NotificationCenterProvider>.");
  return context;
}

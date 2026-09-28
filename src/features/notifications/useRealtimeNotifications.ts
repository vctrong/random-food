"use client";

import { useEffect, useRef, useState } from "react";
import type { NotificationType } from "@/types/notification";

/** Khoảng polling khi realtime không dùng được (docs/notifications.md mục 4). */
const POLL_INTERVAL_MS = 60_000;
const AUTH_ENDPOINT = "/api/realtime/auth";
const NEW_NOTIFICATION_EVENT = "notification:new";

export type RealtimeMode = "idle" | "connecting" | "realtime" | "polling";

export interface NotificationSignal {
  id: string;
  type: NotificationType;
}

interface UseRealtimeNotificationsOptions {
  /** null = chưa đăng nhập → không kết nối, không polling. */
  userId: string | null;
  /** Có thông báo mới (chỉ tín hiệu — dữ liệu thật lấy lại từ API). */
  onNotification: (signal: NotificationSignal) => void;
  /** Cần đồng bộ lại danh sách + số chưa đọc: kết nối lại, quay lại tab, có mạng lại, mỗi nhịp polling. */
  onResync: () => void;
}

/**
 * Nhận thông báo realtime qua Pusher (private-user-{id}); lỗi hoặc chưa cấu hình
 * NEXT_PUBLIC_PUSHER_KEY → polling 60s (tạm dừng khi tab ẩn).
 */
export function useRealtimeNotifications({ userId, onNotification, onResync }: UseRealtimeNotificationsOptions): RealtimeMode {
  const [mode, setMode] = useState<RealtimeMode>("connecting");
  const onNotificationRef = useRef(onNotification);
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onNotificationRef.current = onNotification;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let pollTimer: number | null = null;
    let isPolling = false;
    let wasDisconnected = false;
    let disconnect: (() => void) | null = null;

    const resync = () => {
      if (!disposed) onResyncRef.current();
    };

    const startPolling = () => {
      if (disposed || isPolling) return;
      isPolling = true;
      setMode("polling");
      const tick = () => {
        if (document.visibilityState === "visible") resync();
      };
      pollTimer = window.setInterval(tick, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      isPolling = false;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = null;
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resync);

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap1";

    if (!key) {
      startPolling();
    } else {
      import("pusher-js")
        .then(({ default: Pusher }) => {
          if (disposed) return;
          const pusher = new Pusher(key, { cluster, channelAuthorization: { endpoint: AUTH_ENDPOINT, transport: "ajax" } });
          const channel = pusher.subscribe(`private-user-${userId}`);

          channel.bind(NEW_NOTIFICATION_EVENT, (data: NotificationSignal) => {
            if (!disposed) onNotificationRef.current(data);
          });
          channel.bind("pusher:subscription_succeeded", () => {
            stopPolling();
            setMode("realtime");
          });
          // 401/403/503 từ /api/realtime/auth (vd server chưa cấu hình) → polling.
          channel.bind("pusher:subscription_error", startPolling);

          pusher.connection.bind("state_change", ({ current }: { previous: string; current: string }) => {
            if (current === "connected") {
              stopPolling();
              // Mất kết nối rồi nối lại có thể đã lỡ tín hiệu → đồng bộ lại.
              if (wasDisconnected) resync();
              wasDisconnected = false;
            } else if (current === "unavailable" || current === "failed") {
              wasDisconnected = true;
              startPolling();
            } else if (current === "disconnected") {
              wasDisconnected = true;
            }
          });

          disconnect = () => {
            pusher.unsubscribe(`private-user-${userId}`);
            pusher.disconnect();
          };
        })
        .catch(startPolling);
    }

    return () => {
      disposed = true;
      stopPolling();
      disconnect?.();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resync);
    };
  }, [userId]);

  if (!userId) return "idle";
  // Không có key thì chắc chắn polling — suy ra luôn, không cần chờ effect.
  return process.env.NEXT_PUBLIC_PUSHER_KEY ? mode : "polling";
}

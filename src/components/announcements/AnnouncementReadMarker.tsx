"use client";

import { useEffect } from "react";
import { useNotificationCenter } from "@/components/notifications/NotificationCenterProvider";

/** Mở trang chi tiết (từ Tin tức, banner, link chia sẻ…) cũng tính là đã đọc — CHỈ bài đó, chỉ khi đã đăng nhập. */
export function AnnouncementReadMarker({ id }: { id: string }) {
  const { isAuthenticated, markAnnouncementRead } = useNotificationCenter();

  useEffect(() => {
    if (isAuthenticated) void markAnnouncementRead(id);
  }, [isAuthenticated, markAnnouncementRead, id]);

  return null;
}

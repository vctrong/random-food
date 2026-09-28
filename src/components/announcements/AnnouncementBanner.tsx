"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { DISMISSED_BANNERS_STORAGE_KEY } from "@/constants/announcements";
import { getBannerAnnouncement } from "@/services/announcementService";
import { cn } from "@/lib/utils";
import type { AnnouncementSummary } from "@/types/announcement";
import { ANNOUNCEMENT_TYPE_ICONS, ANNOUNCEMENT_TYPE_TONE } from "./AnnouncementBadges";

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISSED_BANNERS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  try {
    // Chỉ giữ 30 id gần nhất — bài cũ hết hạn thì không cần nhớ mãi.
    window.localStorage.setItem(DISMISSED_BANNERS_STORAGE_KEY, JSON.stringify(ids.slice(-30)));
  } catch {
    // Không lưu được (chế độ riêng tư…) thì chỉ ẩn trong phiên hiện tại.
  }
}

/** Banner trang chủ cho thông báo quan trọng/bảo trì đang hiển thị — đóng rồi thì không hiện lại trên thiết bị này. */
export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<AnnouncementSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBannerAnnouncement().then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      if (readDismissed().includes(result.data.id)) return;
      setAnnouncement(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    if (!announcement) return;
    saveDismissed([...readDismissed(), announcement.id]);
    setAnnouncement(null);
  }

  const Icon = announcement ? ANNOUNCEMENT_TYPE_ICONS[announcement.type] : null;

  return (
    <AnimatePresence>
      {announcement && Icon && (
        <motion.aside
          aria-label="Thông báo quan trọng"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto mt-4 w-full max-w-7xl px-4 md:px-6 lg:px-8"
        >
          <div
            className={cn(
              "relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-surface py-3.5 pl-5 pr-12 shadow-sm sm:items-center",
              announcement.type === "important" ? "border-accent/60" : "border-warning/60",
            )}
          >
            <span
              aria-hidden
              className={cn("absolute inset-y-0 left-0 w-1", announcement.type === "important" ? "bg-accent-strong" : "bg-warning")}
            />
            <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-xl", ANNOUNCEMENT_TYPE_TONE[announcement.type])}>
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm text-text-primary sm:text-base">{announcement.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary sm:line-clamp-1">{announcement.summary}</p>
              </div>
              <Link
                href={`/tin-tuc/${announcement.slug}`}
                className="mt-2 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-strong hover:underline sm:mt-0 dark:text-primary"
              >
                Xem chi tiết
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng thông báo"
              className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-primary-soft hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

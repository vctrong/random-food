"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { recordAnnouncementView } from "@/services/announcementService";

/** Sao chép link + chia sẻ (Web Share API nếu có). Đồng thời ghi 1 lượt xem / phiên trình duyệt. */
export function AnnouncementShareActions({ slug, title, trackView }: { slug: string; title: string; trackView: boolean }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // navigator chỉ có ở client — kiểm tra sau hydrate để server/client render khớp.
    const timer = window.setTimeout(() => setCanShare(typeof navigator.share === "function"), 0);
    if (trackView) {
      const key = `nayangi:announcement-viewed:${slug}`;
      try {
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, "1");
          void recordAnnouncementView(slug);
        }
      } catch {
        void recordAnnouncementView(slug);
      }
    }
    return () => window.clearTimeout(timer);
  }, [slug, trackView]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      showToast("Đã sao chép link thông báo", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Không sao chép được, bạn copy từ thanh địa chỉ nha", "warning");
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url: window.location.href.split("?")[0] });
    } catch {
      // Người dùng đóng bảng chia sẻ — không cần báo gì.
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-primary-line hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {copied ? <Check className="size-4 text-success" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {copied ? "Đã chép" : "Sao chép link"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          aria-label="Chia sẻ thông báo"
          className="grid size-9 place-items-center rounded-full border border-border text-text-secondary transition-colors hover:border-primary-line hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Share2 className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

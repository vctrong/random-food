import { Pin, ShieldCheck, TriangleAlert, Wrench, Sparkles, Newspaper, type LucideIcon } from "lucide-react";
import { ANNOUNCEMENT_TYPE_LABELS, type AnnouncementType } from "@/constants/announcements";
import { cn } from "@/lib/utils";

export const ANNOUNCEMENT_TYPE_ICONS: Record<AnnouncementType, LucideIcon> = {
  news: Newspaper,
  feature: Sparkles,
  maintenance: Wrench,
  important: TriangleAlert,
};

/** Loại quan trọng/bảo trì dùng tông nhấn hồng; tin tức/tính năng dùng tông xanh. */
export const ANNOUNCEMENT_TYPE_TONE: Record<AnnouncementType, string> = {
  news: "bg-primary-soft text-primary-strong dark:text-primary",
  feature: "bg-primary-soft text-primary-strong dark:text-primary",
  maintenance: "bg-warning/20 text-secondary-strong dark:text-warning",
  important: "bg-accent-soft text-accent-ink",
};

const PILL = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold";

export function OfficialBadge({ className }: { className?: string }) {
  return (
    <span className={cn(PILL, "border border-accent/60 bg-accent-soft uppercase tracking-wide text-accent-ink", className)}>
      <ShieldCheck className="size-3.5" aria-hidden />
      Thông báo chính thức
    </span>
  );
}

export function AnnouncementTypeBadge({ type, className }: { type: AnnouncementType; className?: string }) {
  const Icon = ANNOUNCEMENT_TYPE_ICONS[type];
  return (
    <span className={cn(PILL, ANNOUNCEMENT_TYPE_TONE[type], className)}>
      <Icon className="size-3.5" aria-hidden />
      {ANNOUNCEMENT_TYPE_LABELS[type]}
    </span>
  );
}

export function PinnedBadge({ className }: { className?: string }) {
  return (
    <span className={cn(PILL, "bg-secondary-soft text-secondary-strong dark:text-text-primary", className)}>
      <Pin className="size-3.5" aria-hidden />
      Đã ghim
    </span>
  );
}

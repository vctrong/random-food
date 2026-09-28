import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type { AnnouncementSummary } from "@/types/announcement";
import { AnnouncementTypeBadge, PinnedBadge } from "./AnnouncementBadges";

/** Thẻ thông báo chính thức trong danh sách Tin tức / "Thông báo khác". */
export function AnnouncementCard({ announcement, compact = false }: { announcement: AnnouncementSummary; compact?: boolean }) {
  return (
    <Link
      href={`/tin-tuc/${announcement.slug}`}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        announcement.isPinned ? "border-accent/60" : "border-border",
      )}
    >
      {announcement.isPinned && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent-strong" />}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AnnouncementTypeBadge type={announcement.type} />
        {announcement.isPinned && !compact && <PinnedBadge />}
        <time dateTime={announcement.publishAt} className="text-xs text-text-secondary">
          {formatDate(announcement.publishAt)}
        </time>
      </div>
      <h3 className={cn("font-heading text-text-primary", compact ? "line-clamp-2 text-base" : "text-lg")}>{announcement.title}</h3>
      {!compact && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-text-secondary">{announcement.summary}</p>}
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary-strong dark:text-primary">
        Chi tiết
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

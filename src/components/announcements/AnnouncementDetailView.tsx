import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronRight, ClipboardList, Clock, Headset, Mail, MessageCircle, Phone } from "lucide-react";
import { BRAND, CONTACTS } from "@/constants/brand";
import { formatDate } from "@/lib/utils";
import type { AnnouncementDetail, AnnouncementSummary } from "@/types/announcement";
import { AnnouncementCard } from "./AnnouncementCard";
import { AnnouncementTypeBadge, OfficialBadge, PinnedBadge } from "./AnnouncementBadges";
import { AnnouncementShareActions } from "./AnnouncementShareActions";
import { AnnouncementReadMarker } from "./AnnouncementReadMarker";
import { AnnouncementLightbox } from "./AnnouncementLightbox";
import { ANNOUNCEMENT_PROSE_CLASS } from "./announcementProse";

/** "Cần Thơ, ngày 28 tháng 09 năm 2026" theo giờ Việt Nam. */
const CONTENT_ID = "announcement-content";

function formatSignatureDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `Cần Thơ, ngày ${parts.day} tháng ${parts.month} năm ${parts.year}`;
}

interface AnnouncementDetailViewProps {
  announcement: AnnouncementDetail;
  others: AnnouncementSummary[];
  isPreview: boolean;
}

export function AnnouncementDetailView({ announcement, others, isPreview }: AnnouncementDetailViewProps) {
  const contacts = [
    { icon: Mail, label: "Email hỗ trợ", value: CONTACTS.email, href: `mailto:${CONTACTS.email}` },
    { icon: Phone, label: "Hotline / Zalo", value: CONTACTS.phoneDisplay, href: CONTACTS.zalo },
    { icon: MessageCircle, label: "Facebook", value: CONTACTS.facebook.replace(/^https?:\/\//, ""), href: CONTACTS.facebook },
  ];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      {!isPreview && <AnnouncementReadMarker id={announcement.id} />}
      {isPreview && (
        <p className="mb-6 rounded-xl border border-warning/60 bg-warning/15 px-4 py-2.5 text-sm font-semibold text-secondary-strong dark:text-warning">
          Bạn đang xem trước — người dùng chỉ thấy bài này khi đã đăng và nằm trong đối tượng hiển thị.
        </p>
      )}

      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
        <Link href="/" className="transition-colors hover:text-primary">Trang chủ</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/tin-tuc" className="transition-colors hover:text-primary">Tin tức</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/tin-tuc?loai=thong-bao" className="font-medium text-text-primary transition-colors hover:text-primary">
          Thông báo chính thức
        </Link>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <OfficialBadge />
        <AnnouncementTypeBadge type={announcement.type} />
        {announcement.isPinned && <PinnedBadge />}
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-secondary">Mã: {announcement.code}</span>
      </div>

      <h1 className="text-h2 text-text-primary md:text-[2.125rem] md:leading-tight">{announcement.title}</h1>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft">
            <Image src={BRAND.mascot} alt="" width={36} height={36} className="size-9 object-contain" />
            <BadgeCheck className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-surface text-primary-strong dark:text-primary" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Ban quản trị {BRAND.seoName}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                <time dateTime={announcement.publishAt}>{formatDate(announcement.publishAt)}</time>
              </span>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {announcement.readingMinutes} phút đọc
              </span>
            </p>
          </div>
        </div>
        <AnnouncementShareActions slug={announcement.slug} title={announcement.title} trackView={!isPreview} />
      </div>

      {announcement.highlights.length > 0 && (
        <section
          aria-labelledby="announcement-highlights"
          className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent-strong" />
          <h2 id="announcement-highlights" className="mb-4 flex items-center gap-2 text-h4 text-text-primary">
            <ClipboardList className="size-4.5 text-accent-ink" aria-hidden />
            Tóm tắt thông tin quan trọng
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            {announcement.highlights.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background p-3.5">
                <dt className="text-caption font-semibold uppercase tracking-wider text-text-secondary">{item.label}</dt>
                <dd className="mt-1 font-heading text-base text-text-primary">{item.value}</dd>
                {item.note && <dd className="mt-1 text-xs leading-relaxed text-text-secondary">{item.note}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* HTML đã sanitize + render ở server (docs/notifications.md mục 6). */}
      <div id={CONTENT_ID} className={`mt-8 ${ANNOUNCEMENT_PROSE_CLASS}`} dangerouslySetInnerHTML={{ __html: announcement.html }} />
      <AnnouncementLightbox containerId={CONTENT_ID} />

      <div className="mt-10 rounded-2xl border border-primary-line bg-primary-soft/40 px-5 py-5">
        <p className="text-sm italic text-text-secondary">{formatSignatureDate(announcement.publishAt)}</p>
        <p className="mt-2 text-sm text-text-primary">Trân trọng,</p>
        <p className="font-heading text-lg text-primary-strong dark:text-primary">Đội ngũ {BRAND.seoName}</p>
      </div>

      <section aria-labelledby="announcement-support" className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 id="announcement-support" className="flex items-center gap-2 text-h4 text-text-primary">
          <Headset className="size-4.5 text-primary" aria-hidden />
          Cần hỗ trợ thêm?
        </h2>
        <p className="mt-1 text-sm text-text-secondary">Nếu còn thắc mắc về thông báo này, bạn liên hệ trực tiếp với đội ngũ vận hành nha.</p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {contacts.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex h-full items-center gap-3 rounded-xl bg-background px-3.5 py-3 transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="size-4.5 shrink-0 text-primary-strong dark:text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[11px] text-text-secondary">{label}</span>
                  <span className="block truncate text-sm font-semibold text-text-primary">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <Link
          href="/tin-tuc?loai=thong-bao"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-line hover:text-text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Quay lại Thông báo chính thức
        </Link>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="other-announcements" className="mt-12 border-t border-border pt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-caption font-bold uppercase tracking-wider text-primary">Cập nhật khác</p>
              <h2 id="other-announcements" className="text-h3 text-text-primary">Thông báo khác</h2>
            </div>
            <Link href="/tin-tuc?loai=thong-bao" className="text-sm font-semibold text-primary-strong hover:underline dark:text-primary">
              Xem tất cả
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {others.map((item) => (
              <AnnouncementCard key={item.id} announcement={item} compact />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

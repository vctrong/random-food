import type {
  AnnouncementDisplayStatus,
  AnnouncementTargetRole,
  AnnouncementType,
} from "@/constants/announcements";
import type { TipTapNode } from "@/lib/announcementContent";

export interface AnnouncementHighlight {
  label: string;
  value: string;
  note?: string;
}

/** Thẻ trong danh sách Tin tức / banner / dropdown chuông. */
export interface AnnouncementSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: AnnouncementType;
  isPinned: boolean;
  publishAt: string;
  code: string;
}

export interface AnnouncementDetail extends AnnouncementSummary {
  highlights: AnnouncementHighlight[];
  /** HTML đã render ở server từ TipTap JSON đã sanitize. */
  html: string;
  readingMinutes: number;
}

export interface AdminAnnouncementRow {
  id: string;
  slug: string;
  title: string;
  type: AnnouncementType;
  targetRoles: AnnouncementTargetRole[];
  isPinned: boolean;
  displayStatus: AnnouncementDisplayStatus;
  publishAt: string | null;
  expireAt: string | null;
  viewCount: number;
  updatedAt: string;
}

export interface AdminAnnouncementDetail extends AdminAnnouncementRow {
  summary: string;
  highlights: AnnouncementHighlight[];
  content: TipTapNode;
  status: "draft" | "published";
}

/** Dữ liệu form Admin gửi lên (tạo/sửa). */
export interface AnnouncementInput {
  title: string;
  slug?: string;
  summary: string;
  highlights: AnnouncementHighlight[];
  content: unknown;
  type: AnnouncementType;
  targetRoles: AnnouncementTargetRole[];
  isPinned: boolean;
  status: "draft" | "published";
  /** ISO — bắt buộc khi hẹn giờ; "Đăng ngay" để trống (server lấy thời điểm hiện tại). */
  publishAt?: string | null;
  expireAt?: string | null;
}

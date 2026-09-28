export const ANNOUNCEMENT_TYPES = ["news", "feature", "maintenance", "important"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  news: "Tin tức",
  feature: "Cập nhật tính năng",
  maintenance: "Bảo trì",
  important: "Quan trọng",
};

/** Hậu tố mã bài (vd TB-2026/09-SYS) — mã tự sinh, không lưu DB. */
export const ANNOUNCEMENT_CODE_SUFFIX: Record<AnnouncementType, string> = {
  news: "NEWS",
  feature: "FEAT",
  maintenance: "SYS",
  important: "IMP",
};

/** Loại hiện banner trang chủ. */
export const BANNER_ANNOUNCEMENT_TYPES: readonly AnnouncementType[] = ["important", "maintenance"];

/** "all" = mọi người kể cả Guest. */
export const ANNOUNCEMENT_TARGET_ROLES = ["all", "user", "foodreviewer", "admin"] as const;
export type AnnouncementTargetRole = (typeof ANNOUNCEMENT_TARGET_ROLES)[number];

export const ANNOUNCEMENT_TARGET_LABELS: Record<AnnouncementTargetRole, string> = {
  all: "Tất cả (kể cả khách)",
  user: "Thành viên",
  foodreviewer: "FoodReviewer",
  admin: "Admin",
};

export type AnnouncementDisplayStatus = "draft" | "scheduled" | "live" | "expired";

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementDisplayStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  live: "Đang hiển thị",
  expired: "Hết hạn",
};

export const ANNOUNCEMENT_LIMITS = {
  titleMax: 150,
  summaryMax: 300,
  slugMax: 100,
  highlightsMax: 3,
  highlightLabelMax: 40,
  highlightValueMax: 60,
  highlightNoteMax: 120,
  /** Giới hạn kích thước JSON nội dung (ký tự) — chặn payload bất thường. */
  contentMaxChars: 200_000,
} as const;

/** Slug trùng tên route con của /api/announcements — không được dùng. */
export const RESERVED_ANNOUNCEMENT_SLUGS: ReadonlySet<string> = new Set(["seen", "banner"]);

/** localStorage: id các banner trang chủ user đã đóng. */
export const DISMISSED_BANNERS_STORAGE_KEY = "nayangi:dismissed-announcements";

export const ANNOUNCEMENT_PAGE_SIZE = 12;

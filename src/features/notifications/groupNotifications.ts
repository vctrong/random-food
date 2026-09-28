import type { NotificationItem, NotificationType } from "@/types/notification";

/**
 * Hàm thuần: gộp các thông báo LIỀN NHAU cùng loại, cùng ngày (giờ VN) thành 1
 * dòng — vd "3 đóng góp của bạn đã được duyệt". Không tách theo trạng thái đọc:
 * mỗi mục được đọc riêng lẻ mà nhóm không bị vỡ/đóng lại. Loại có lý do/feedback
 * riêng không gộp để user không bỏ sót nội dung.
 */

export const GROUPABLE_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  "food_approved",
  "content_corrected",
  "report_handled",
  "report_created",
  "category_proposal_approved",
  "category_proposal_merged",
]);

export interface NotificationGroup {
  /** id của thông báo mới nhất trong nhóm — ổn định để làm React key. */
  key: string;
  type: NotificationType;
  items: NotificationItem[];
  ids: string[];
  /** true khi MỌI mục trong nhóm đã đọc. */
  isRead: boolean;
  unreadCount: number;
  createdAt: string;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Số ngày kể từ epoch theo giờ Việt Nam — so sánh "cùng ngày" không phụ thuộc múi giờ máy. */
export function vnDayNumber(date: Date): number {
  return Math.floor((date.getTime() + VN_OFFSET_MS) / DAY_MS);
}

/** Đầu vào đã sắp xếp mới → cũ (đúng thứ tự API trả về). */
export function groupNotifications(items: NotificationItem[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    const canJoin =
      last &&
      GROUPABLE_TYPES.has(item.type) &&
      last.type === item.type &&
      vnDayNumber(new Date(last.createdAt)) === vnDayNumber(new Date(item.createdAt));
    if (canJoin) {
      last.items.push(item);
      last.ids.push(item.id);
      if (!item.isRead) last.unreadCount += 1;
      last.isRead = last.unreadCount === 0;
    } else {
      const unreadCount = item.isRead ? 0 : 1;
      groups.push({ key: item.id, type: item.type, items: [item], ids: [item.id], isRead: unreadCount === 0, unreadCount, createdAt: item.createdAt });
    }
  }
  return groups;
}

export type TimeSection = "today" | "this_week" | "earlier";

export const TIME_SECTION_LABELS: Record<TimeSection, string> = {
  today: "Hôm nay",
  this_week: "Tuần này",
  earlier: "Trước đó",
};

/** "Tuần này" = từ thứ Hai của tuần hiện tại (giờ VN), không tính hôm nay. */
export function timeSectionOf(createdAt: string, now: Date = new Date()): TimeSection {
  const day = vnDayNumber(new Date(createdAt));
  const today = vnDayNumber(now);
  if (day >= today) return "today";
  // Ngày 0 (1/1/1970) là thứ Năm → (day + 3) % 7 = 0 ứng với thứ Hai.
  const mondayOfThisWeek = today - ((today + 3) % 7);
  return day >= mondayOfThisWeek ? "this_week" : "earlier";
}

/** Chia nhóm theo mốc thời gian, giữ thứ tự; bỏ mốc rỗng. */
export function sectionGroups(
  groups: NotificationGroup[],
  now: Date = new Date(),
): { section: TimeSection; groups: NotificationGroup[] }[] {
  const order: TimeSection[] = ["today", "this_week", "earlier"];
  return order
    .map((section) => ({ section, groups: groups.filter((group) => timeSectionOf(group.createdAt, now) === section) }))
    .filter((entry) => entry.groups.length > 0);
}

import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES } from "@/constants/notifications";
import type { NotificationItem, NotificationType } from "@/types/notification";
import { buildGroupTitle, buildNotificationContent } from "./notificationContent";
import { groupNotifications, sectionGroups, timeSectionOf } from "./groupNotifications";

function item(id: string, type: NotificationType, createdAt: string, isRead = false, payload: Record<string, unknown> = {}): NotificationItem {
  return { id, type, payload, link: null, isRead, createdAt };
}

describe("buildNotificationContent", () => {
  it("mọi loại đều dựng được tiêu đề, kể cả khi payload rỗng", () => {
    for (const type of NOTIFICATION_TYPES) {
      const content = buildNotificationContent(type, {});
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.title).not.toContain("undefined");
    }
  });

  it("yêu cầu sửa kèm góp ý và nút Sửa ngay", () => {
    const content = buildNotificationContent("food_needs_revision", {
      targetType: "food",
      targetId: "1",
      name: "Bún bò",
      feedback: "Ảnh bị mờ",
    });
    expect(content.title).toBe("Món “Bún bò” cần bạn sửa thêm một chút");
    expect(content.body).toBe("Góp ý: Ảnh bị mờ");
    expect(content.actionLabel).toBe("Sửa ngay");
  });

  it("content_corrected dịch tên field sang nhãn tiếng Việt", () => {
    const content = buildNotificationContent("content_corrected", {
      targetType: "restaurant",
      name: "Cô Ba",
      fields: ["address", "openingHours"],
    });
    expect(content.title).toBe("Tụi mình đã chỉnh địa chỉ, giờ mở cửa của quán “Cô Ba”");
  });

  it("gỡ đánh giá có cảnh cáo ghi số lần nhắc nhở", () => {
    const content = buildNotificationContent("content_removed", {
      targetType: "review",
      name: "Cơm tấm",
      reason: "Spam",
      warningCount: 2,
    });
    expect(content.title).toBe("Đánh giá của bạn cho món “Cơm tấm” đã bị gỡ");
    expect(content.body).toContain("Lý do: Spam");
    expect(content.body).toContain("lần nhắc nhở thứ 2");
  });

  it("tiêu đề nhóm", () => {
    expect(buildGroupTitle("food_approved", 3)).toBe("3 đóng góp của bạn đã được duyệt");
  });
});

describe("groupNotifications", () => {
  it("gộp liền nhau cùng loại, cùng ngày VN — không tách theo trạng thái đọc", () => {
    const groups = groupNotifications([
      item("a", "food_approved", "2026-09-28T10:00:00Z"),
      item("b", "food_approved", "2026-09-28T09:00:00Z", true),
      item("c", "food_approved", "2026-09-28T08:00:00Z", true),
      item("d", "food_needs_revision", "2026-09-28T07:00:00Z"),
      item("e", "food_needs_revision", "2026-09-28T06:00:00Z"),
    ]);
    expect(groups.map((group) => group.ids)).toEqual([["a", "b", "c"], ["d"], ["e"]]);
    expect(groups[0]).toMatchObject({ unreadCount: 1, isRead: false });
  });

  it("nhóm chỉ là đã đọc khi mọi mục đã đọc", () => {
    const [group] = groupNotifications([
      item("a", "report_handled", "2026-09-28T10:00:00Z", true),
      item("b", "report_handled", "2026-09-28T09:00:00Z", true),
    ]);
    expect(group).toMatchObject({ isRead: true, unreadCount: 0 });
  });

  it("khác ngày theo giờ VN thì không gộp (17:00Z là 0h hôm sau ở VN)", () => {
    const groups = groupNotifications([
      item("a", "report_handled", "2026-09-28T17:30:00Z"),
      item("b", "report_handled", "2026-09-28T16:30:00Z"),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("timeSectionOf", () => {
  // Thứ Tư 30/09/2026, 12:00 giờ VN.
  const now = new Date("2026-09-30T05:00:00Z");

  it("chia Hôm nay / Tuần này (từ thứ Hai) / Trước đó", () => {
    expect(timeSectionOf("2026-09-30T00:30:00Z", now)).toBe("today");
    expect(timeSectionOf("2026-09-28T02:00:00Z", now)).toBe("this_week"); // thứ Hai
    expect(timeSectionOf("2026-09-27T10:00:00Z", now)).toBe("earlier"); // Chủ nhật tuần trước
  });

  it("bỏ mốc rỗng", () => {
    const groups = groupNotifications([item("a", "account_unbanned", "2026-09-30T01:00:00Z")]);
    expect(sectionGroups(groups, now).map((entry) => entry.section)).toEqual(["today"]);
  });
});

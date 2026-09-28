import { describe, expect, it } from "vitest";
import { OPTIONAL_EMAIL_DEFAULTS } from "@/constants/notifications";
import { canRoleSeeAnnouncement, getAnnouncementDisplayStatus, liveAnnouncementFilter } from "@/lib/announcementStatus";
import { shouldSendEmail } from "./emailPolicy";
import { buildNotificationLink } from "./links";

const defaults: Record<string, boolean> = { ...OPTIONAL_EMAIL_DEFAULTS };

describe("shouldSendEmail", () => {
  it("loại bắt buộc luôn gửi, bất kể tuỳ chọn", () => {
    expect(shouldSendEmail("account_banned", {}, {})).toBe(true);
    expect(shouldSendEmail("role_changed", { previousRole: "user", newRole: "admin" }, {})).toBe(true);
  });

  it("kết quả ứng tuyển chỉ bắt buộc khi được duyệt", () => {
    expect(shouldSendEmail("reviewer_application_result", { decision: "approved" }, {})).toBe(true);
    expect(shouldSendEmail("reviewer_application_result", { decision: "rejected" }, {})).toBe(false);
  });

  it("đổi mật khẩu qua Quên mật khẩu không gửi trùng email", () => {
    expect(shouldSendEmail("password_changed", { method: "reset" }, {})).toBe(false);
    expect(shouldSendEmail("password_changed", { method: "change" }, {})).toBe(true);
  });

  it("loại tuỳ chọn theo preference, content_removed mặc định tắt", () => {
    expect(shouldSendEmail("food_approved", {}, defaults)).toBe(true);
    expect(shouldSendEmail("content_removed", {}, defaults)).toBe(false);
    expect(shouldSendEmail("food_approved", {}, { ...defaults, food_approved: false })).toBe(false);
  });

  it("login_failed và loại không có kênh email không bao giờ gửi", () => {
    expect(shouldSendEmail("login_failed", { reason: "wrong_password" }, { login_failed: true })).toBe(false);
    expect(shouldSendEmail("report_handled", {}, defaults)).toBe(false);
  });
});

describe("buildNotificationLink", () => {
  it("yêu cầu sửa món mở thẳng form sửa", () => {
    expect(buildNotificationLink("food_needs_revision", { targetType: "food", targetId: "abc", name: "x", feedback: "y" })).toBe(
      "/dong-gop?edit=abc",
    );
  });

  it("thông báo chỉ để đọc không có link", () => {
    expect(buildNotificationLink("account_banned", {})).toBeNull();
  });
});

describe("announcement status", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const day = 24 * 60 * 60 * 1000;

  it("tính trạng thái từ publishAt/expireAt", () => {
    expect(getAnnouncementDisplayStatus({ status: "draft", publishAt: now }, now)).toBe("draft");
    expect(getAnnouncementDisplayStatus({ status: "published", publishAt: new Date(now.getTime() + day) }, now)).toBe("scheduled");
    expect(getAnnouncementDisplayStatus({ status: "published", publishAt: new Date(now.getTime() - day) }, now)).toBe("live");
    expect(
      getAnnouncementDisplayStatus({ status: "published", publishAt: new Date(now.getTime() - 2 * day), expireAt: now }, now),
    ).toBe("expired");
  });

  it("Guest chỉ thấy bài nhắm tất cả", () => {
    expect(canRoleSeeAnnouncement(["all"], null)).toBe(true);
    expect(canRoleSeeAnnouncement(["user"], null)).toBe(false);
    expect(canRoleSeeAnnouncement(["foodreviewer", "admin"], "admin")).toBe(true);
    expect(liveAnnouncementFilter(null, now).targetRoles).toEqual({ $in: ["all"] });
  });
});

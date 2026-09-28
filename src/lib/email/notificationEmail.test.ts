import { describe, expect, it } from "vitest";
import { MANDATORY_EMAIL_TYPES, OPTIONAL_EMAIL_DEFAULTS, type NotificationType } from "@/constants/notifications";
import { buildNotificationEmail } from "./templates";

const base = { to: "a@example.com", name: "Ttong", actionUrl: null, settingsUrl: null };

describe("buildNotificationEmail", () => {
  it("dựng được email cho mọi loại có kênh email", () => {
    const types = [...MANDATORY_EMAIL_TYPES, ...(Object.keys(OPTIONAL_EMAIL_DEFAULTS) as NotificationType[])];
    for (const type of types) {
      const email = buildNotificationEmail({ ...base, type, payload: {} });
      expect(email.subject).toContain("NayAnGi");
      expect(email.html).toContain("Chào Ttong");
      expect(email.text).not.toContain("undefined");
    }
  });

  it("escape nội dung do người dùng nhập (tên món, góp ý)", () => {
    const email = buildNotificationEmail({
      ...base,
      type: "food_needs_revision",
      payload: { targetType: "food", targetId: "1", name: "<b>Bún</b>", feedback: "<script>x</script>" },
      actionUrl: "https://nayangi.io.vn/dong-gop?edit=1",
      settingsUrl: "https://nayangi.io.vn/cai-dat#thong-bao",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Góp ý từ đội kiểm duyệt");
    expect(email.html).toContain("Sửa ngay");
    expect(email.html).toContain("Tắt trong Cài đặt");
  });

  it("email bắt buộc ghi rõ không thể tắt, kèm hộp liên hệ", () => {
    const email = buildNotificationEmail({ ...base, type: "account_banned", payload: { reason: "Spam" } });
    expect(email.html).toContain("email bắt buộc");
    expect(email.html).toContain("Bạn nghĩ đây là nhầm lẫn?");
    expect(email.text).toContain("Lý do: Spam");
  });
});

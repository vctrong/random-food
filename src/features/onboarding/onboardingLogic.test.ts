import { describe, expect, it } from "vitest";
import { ONBOARDING_SNOOZE_DURATION_MS } from "@/constants/onboarding";
import { isOnboardingAllowedPath, isSnoozeActive } from "./onboardingLogic";

describe("isOnboardingAllowedPath", () => {
  it("hiện ở trang chủ và các trang public khám phá món", () => {
    for (const path of ["/", "/random", "/mon-an", "/mon-an/", "/tin-tuc", "/ve-chung-toi", "/mon-an/6650a1b2c3d4e5f601234567"]) {
      expect(isOnboardingAllowedPath(path)).toBe(true);
    }
  });

  it("không hiện ở trang tài khoản, form đóng góp, dashboard", () => {
    for (const path of [
      "/dang-nhap",
      "/dang-ky",
      "/quen-mat-khau",
      "/mo-khoa-tai-khoan",
      "/ho-so",
      "/cai-dat",
      "/lich-su",
      "/da-luu",
      "/dong-gop",
      "/mon-an/dong-gop",
      "/mon-an/abc/xyz",
      "/ung-tuyen-reviewer",
      "/admin",
      "/reviewer/lich-su",
    ]) {
      expect(isOnboardingAllowedPath(path)).toBe(false);
    }
  });
});

describe("isSnoozeActive", () => {
  const now = 1_800_000_000_000;

  it("chưa từng snooze → hiện", () => {
    expect(isSnoozeActive(null, now)).toBe(false);
  });

  it("trong vòng 24h → ẩn", () => {
    expect(isSnoozeActive(String(now), now)).toBe(true);
    expect(isSnoozeActive(String(now - ONBOARDING_SNOOZE_DURATION_MS + 1), now)).toBe(true);
  });

  it("đủ/quá 24h → hiện lại", () => {
    expect(isSnoozeActive(String(now - ONBOARDING_SNOOZE_DURATION_MS), now)).toBe(false);
    expect(isSnoozeActive(String(now - ONBOARDING_SNOOZE_DURATION_MS * 3), now)).toBe(false);
  });

  it("giá trị hỏng hoặc ở tương lai → hiện", () => {
    expect(isSnoozeActive("abc", now)).toBe(false);
    expect(isSnoozeActive("", now)).toBe(false);
    expect(isSnoozeActive(String(now + 60_000), now)).toBe(false);
  });
});

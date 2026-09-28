import { describe, expect, it } from "vitest";
import {
  OTP_SEND_POLICY,
  describeUserAgent,
  evaluateSendAllowance,
  formatCountdown,
  getPasswordChecks,
  isOpaqueTokenFormat,
  isOtpFormat,
  isValidEmail,
  maskEmail,
  sendsRemaining,
} from "./passwordResetLogic";

const NOW = Date.UTC(2026, 8, 27, 7, 0, 0);
const at = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000);

describe("maskEmail", () => {
  it("giữ 2 ký tự đầu và domain", () => {
    expect(maskEmail("trong@gmail.com")).toBe("tr***@gmail.com");
  });
  it("phần trước @ ngắn chỉ giữ 1 ký tự", () => {
    expect(maskEmail("ab@x.vn")).toBe("a***@x.vn");
  });
});

describe("isValidEmail / định dạng", () => {
  it("nhận email hợp lệ, loại email sai", () => {
    expect(isValidEmail("a.b@example.com")).toBe(true);
    expect(isValidEmail("abc")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
  it("OTP đúng 6 chữ số; token 64 hex", () => {
    expect(isOtpFormat("012345")).toBe(true);
    expect(isOtpFormat("12345")).toBe(false);
    expect(isOtpFormat("12a456")).toBe(false);
    expect(isOpaqueTokenFormat("a".repeat(64))).toBe(true);
    expect(isOpaqueTokenFormat("A".repeat(64))).toBe(false);
  });
});

describe("evaluateSendAllowance", () => {
  it("chưa gửi lần nào → được gửi", () => {
    expect(evaluateSendAllowance([], NOW, OTP_SEND_POLICY)).toEqual({ allowed: true });
  });
  it("vừa gửi 20 giây trước → chờ 40 giây", () => {
    expect(evaluateSendAllowance([at(20)], NOW, OTP_SEND_POLICY)).toEqual({ allowed: false, reason: "cooldown", retryAfterMs: 40_000 });
  });
  it("đủ 5 lần trong giờ → hourlyLimit tới khi lần cũ nhất ra khỏi cửa sổ", () => {
    const history = [at(3000), at(2000), at(1000), at(500), at(100)];
    expect(evaluateSendAllowance(history, NOW, OTP_SEND_POLICY)).toEqual({
      allowed: false,
      reason: "hourlyLimit",
      retryAfterMs: (3600 - 3000) * 1000,
    });
    expect(sendsRemaining(history, NOW, OTP_SEND_POLICY)).toBe(0);
  });
  it("lần gửi quá 1 giờ không tính", () => {
    expect(sendsRemaining([at(4000), at(3700)], NOW, OTP_SEND_POLICY)).toBe(5);
  });
});

describe("getPasswordChecks", () => {
  it("tick từng điều kiện theo chính sách", () => {
    const passed = (password: string) => getPasswordChecks(password).filter((check) => check.passed).map((check) => check.id);
    expect(passed("abc")).toEqual(["letter"]);
    expect(passed("abcdefg1!")).toEqual(["length", "letter", "number", "special"]);
  });
});

describe("tiện ích hiển thị", () => {
  it("formatCountdown", () => {
    expect(formatCountdown(299_000)).toBe("04:59");
    expect(formatCountdown(-5)).toBe("00:00");
    expect(formatCountdown(1)).toBe("00:01");
  });
  it("describeUserAgent", () => {
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe("Chrome trên Windows");
    expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1")).toBe("Safari trên iOS");
    expect(describeUserAgent(null)).toBeNull();
  });
});

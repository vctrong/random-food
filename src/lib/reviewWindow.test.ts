import { describe, expect, it } from "vitest";
import {
  REVIEW_CREATE_WINDOW_MS,
  REVIEW_EDIT_WINDOW_MS,
  formatRemainingTime,
  getCreateReviewRemainingMs,
  getEditReviewRemainingMs,
  getRemainingMs,
} from "./reviewWindow";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-09-01T00:00:00.000Z");
const startMs = start.getTime();

describe("getRemainingMs", () => {
  it("trả phần còn lại khi chưa hết hạn", () => {
    expect(getRemainingMs(start, 10 * HOUR, startMs + 4 * HOUR)).toBe(6 * HOUR);
  });

  it("trả 0 khi vừa chạm hoặc đã quá hạn", () => {
    expect(getRemainingMs(start, 10 * HOUR, startMs + 10 * HOUR)).toBe(0);
    expect(getRemainingMs(start, 10 * HOUR, startMs + 11 * HOUR)).toBe(0);
  });

  it("nhận chuỗi ISO và trả 0 với mốc không hợp lệ", () => {
    expect(getRemainingMs(start.toISOString(), HOUR, startMs)).toBe(HOUR);
    expect(getRemainingMs("không-phải-ngày", HOUR, startMs)).toBe(0);
  });
});

describe("cửa sổ đánh giá", () => {
  it("sửa review: 24h kể từ lúc tạo", () => {
    expect(REVIEW_EDIT_WINDOW_MS).toBe(24 * HOUR);
    expect(getEditReviewRemainingMs(start, startMs + 23 * HOUR)).toBe(HOUR);
    expect(getEditReviewRemainingMs(start, startMs + 24 * HOUR)).toBe(0);
  });

  it("viết review: 72h kể từ lần check-in", () => {
    expect(REVIEW_CREATE_WINDOW_MS).toBe(72 * HOUR);
    expect(getCreateReviewRemainingMs(start, startMs + 71 * HOUR)).toBe(HOUR);
    expect(getCreateReviewRemainingMs(start, startMs + 72 * HOUR)).toBe(0);
  });
});

describe("formatRemainingTime", () => {
  it("định dạng theo ngày/giờ/phút", () => {
    expect(formatRemainingTime(30_000)).toBe("dưới 1 phút");
    expect(formatRemainingTime(12 * 60_000)).toBe("12 phút");
    expect(formatRemainingTime(3 * HOUR)).toBe("3 giờ");
    expect(formatRemainingTime(3 * HOUR + 12 * 60_000)).toBe("3 giờ 12 phút");
    expect(formatRemainingTime(48 * HOUR)).toBe("2 ngày");
    expect(formatRemainingTime(53 * HOUR + 59 * 60_000)).toBe("2 ngày 5 giờ");
  });
});

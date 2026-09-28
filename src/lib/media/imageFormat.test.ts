import { describe, expect, it } from "vitest";
import { chooseOutputType, extensionFor, fallbackOutputType, hasTransparentPixels } from "./imageFormat";

describe("imageFormat", () => {
  it("dò pixel trong suốt theo kênh alpha", () => {
    expect(hasTransparentPixels([10, 20, 30, 255, 0, 0, 0, 255])).toBe(false);
    expect(hasTransparentPixels([10, 20, 30, 255, 0, 0, 0, 0])).toBe(true);
    expect(hasTransparentPixels([255, 255, 255, 254])).toBe(true);
    expect(hasTransparentPixels([])).toBe(false);
  });

  it("có trong suốt + định dạng hỗ trợ alpha → WebP", () => {
    expect(chooseOutputType({ sourceType: "image/png", hasTransparency: true })).toBe("image/webp");
    expect(chooseOutputType({ sourceType: "image/webp", hasTransparency: true })).toBe("image/webp");
    expect(chooseOutputType({ sourceType: "image/gif", hasTransparency: true })).toBe("image/webp");
  });

  it("không trong suốt → giữ JPEG như cũ (kể cả PNG/WebP gốc)", () => {
    expect(chooseOutputType({ sourceType: "image/png", hasTransparency: false })).toBe("image/jpeg");
    expect(chooseOutputType({ sourceType: "image/webp", hasTransparency: false })).toBe("image/jpeg");
    expect(chooseOutputType({ sourceType: "image/jpeg", hasTransparency: false })).toBe("image/jpeg");
  });

  it("JPEG/HEIC không có alpha thật → luôn JPEG dù cờ trong suốt bật nhầm", () => {
    expect(chooseOutputType({ sourceType: "image/jpeg", hasTransparency: true })).toBe("image/jpeg");
    expect(chooseOutputType({ sourceType: "image/heic", hasTransparency: true })).toBe("image/jpeg");
  });

  it("trình duyệt không xuất được WebP → lùi về PNG; xuất đúng thì không đổi", () => {
    expect(fallbackOutputType("image/webp", "image/png")).toBe("image/png");
    expect(fallbackOutputType("image/webp", "image/webp")).toBeNull();
    expect(fallbackOutputType("image/jpeg", "image/jpeg")).toBeNull();
  });

  it("đuôi file theo định dạng", () => {
    expect(extensionFor("image/jpeg")).toBe(".jpg");
    expect(extensionFor("image/webp")).toBe(".webp");
    expect(extensionFor("image/png")).toBe(".png");
  });
});

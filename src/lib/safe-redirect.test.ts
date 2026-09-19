import { describe, expect, it } from "vitest";
import { sanitizeCallbackUrl } from "./safe-redirect";

describe("sanitizeCallbackUrl", () => {
  it("giữ nguyên đường dẫn nội bộ hợp lệ", () => {
    expect(sanitizeCallbackUrl("/mon-an/dong-gop")).toBe("/mon-an/dong-gop");
    expect(sanitizeCallbackUrl("/admin?tab=users")).toBe("/admin?tab=users");
  });

  it("null/undefined/rỗng → mặc định /", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
    expect(sanitizeCallbackUrl("")).toBe("/");
  });

  it("chặn protocol-relative //evil.com", () => {
    expect(sanitizeCallbackUrl("//evil.com")).toBe("/");
  });

  it("chặn scheme tuyệt đối https://evil.com", () => {
    expect(sanitizeCallbackUrl("https://evil.com")).toBe("/");
  });

  it("chặn backslash kiểu /\\evil.com (trình duyệt hiểu như //evil.com)", () => {
    expect(sanitizeCallbackUrl("/\\evil.com")).toBe("/");
  });

  it("chặn scheme javascript:", () => {
    expect(sanitizeCallbackUrl("javascript:alert(1)")).toBe("/");
  });

  it("chặn giá trị encode để lách (%2F%2Fevil.com)", () => {
    expect(sanitizeCallbackUrl("%2F%2Fevil.com")).toBe("/");
  });
});

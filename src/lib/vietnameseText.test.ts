import { describe, expect, it } from "vitest";
import { findHighlightRanges, fuzzyScore, normalizeVietnamese, slugifyVietnamese, splitByRanges } from "./vietnameseText";

describe("normalizeVietnamese", () => {
  it("bỏ dấu, đ → d, lowercase, gộp khoảng trắng", () => {
    expect(normalizeVietnamese("  Hủ Tiếu   Cô Ba! ")).toBe("hu tieu co ba");
    expect(normalizeVietnamese("Đường 30/4")).toBe("duong 30 4");
  });

  it("slug giữ đúng hành vi slugify cũ", () => {
    expect(slugifyVietnamese("Chè / Tráng miệng")).toBe("che-trang-mieng");
  });
});

describe("fuzzyScore", () => {
  it("khớp không dấu, không phân biệt hoa thường", () => {
    expect(fuzzyScore("hu tieu", "Hủ Tiếu Cô Ba")).toBeGreaterThan(0.9);
  });

  it("chịu lỗi gõ sai 1–2 ký tự", () => {
    expect(fuzzyScore("hu tiue", "Hủ Tiếu Cô Ba")).toBeGreaterThan(0);
    expect(fuzzyScore("ninh kieuu", "45 Mậu Thân, Ninh Kiều")).toBeGreaterThan(0);
  });

  it("khớp theo từng phần của tên", () => {
    expect(fuzzyScore("co ba", "Hủ Tiếu Cô Ba")).toBeGreaterThan(0);
  });

  it("lỗi gõ không tính khi sai ngay chữ đầu (tránh 'tieu' khớp 'Kiều')", () => {
    expect(fuzzyScore("hu tieu", "67 Trần Hưng Đạo, Ninh Kiều")).toBe(0);
  });

  it("không khớp khi khác hẳn", () => {
    expect(fuzzyScore("pizza", "Hủ Tiếu Cô Ba")).toBe(0);
  });
});

describe("findHighlightRanges", () => {
  it("trả vị trí trên chuỗi gốc có dấu", () => {
    const parts = splitByRanges("Hủ Tiếu Cô Ba", findHighlightRanges("Hủ Tiếu Cô Ba", "hu tieu"));
    expect(parts.filter((part) => part.highlight).map((part) => part.text)).toEqual(["Hủ", "Tiếu"]);
  });
});

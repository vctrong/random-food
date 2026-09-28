import { describe, expect, it } from "vitest";
import {
  buildVisibleCategoryChips,
  getProposalHint,
  suggestCategoriesFromName,
  type SuggestableCategory,
} from "./categorySuggest";

const CATEGORIES: SuggestableCategory[] = [
  { id: "banh", name: "Bánh", slug: "banh", foodCount: 2 },
  { id: "bun", name: "Bún", slug: "bun", foodCount: 1 },
  { id: "com", name: "Cơm", slug: "com", foodCount: 5 },
  { id: "hu-tieu", name: "Hủ tiếu", slug: "hu-tieu", foodCount: 1 },
  { id: "che", name: "Chè / Tráng miệng", slug: "che-trang-mieng", foodCount: 1 },
  { id: "chay", name: "Chay", slug: "chay", foodCount: 0 },
  { id: "khac", name: "Khác", slug: "khac", foodCount: 9 },
];

const ids = (list: SuggestableCategory[]) => list.map((category) => category.id);

describe("suggestCategoriesFromName", () => {
  it("khớp không dấu theo ranh giới từ", () => {
    expect(ids(suggestCategoriesFromName("Hủ tiếu Nam Vang", CATEGORIES))).toEqual(["hu-tieu"]);
  });

  it("trả nhiều danh mục cùng lúc, theo thứ tự xuất hiện", () => {
    expect(ids(suggestCategoriesFromName("Cơm chay thập cẩm", CATEGORIES))).toEqual(["com", "chay"]);
  });

  it("khớp từng phần của danh mục ghép", () => {
    expect(ids(suggestCategoriesFromName("Chè bưởi Cần Thơ", CATEGORIES))).toEqual(["che"]);
  });

  it("không khớp nửa từ và không gợi ý Khác", () => {
    expect(ids(suggestCategoriesFromName("Bánh bò", CATEGORIES))).toEqual(["banh"]);
    expect(ids(suggestCategoriesFromName("Món khác", CATEGORIES))).toEqual([]);
  });
});

describe("buildVisibleCategoryChips", () => {
  it("đẩy danh mục gợi ý lên đầu rồi tới phổ biến, bỏ Khác, cắt theo limit", () => {
    const chips = buildVisibleCategoryChips(CATEGORIES, "Hủ tiếu gõ", 3);
    expect(chips.map((chip) => [chip.category.id, chip.suggested])).toEqual([
      ["hu-tieu", true],
      ["com", false],
      ["banh", false],
    ]);
  });
});

describe("getProposalHint", () => {
  it("gợi ý chọn kết hợp cho tên dạng '<loại món> chay'", () => {
    const hint = getProposalHint("Bún chay", CATEGORIES);
    expect(hint.kind).toBe("combo");
    if (hint.kind === "combo") expect(ids(hint.categories)).toEqual(["bun", "chay"]);
  });

  it("gợi ý 'có phải ý bạn là' khi gõ sai nhẹ", () => {
    const hint = getProposalHint("Búnn", CATEGORIES);
    expect(hint.kind).toBe("did_you_mean");
    if (hint.kind === "did_you_mean") expect(hint.category.id).toBe("bun");
  });

  it("không gợi ý khi tên thật sự mới", () => {
    expect(getProposalHint("Đồ nướng", CATEGORIES).kind).toBe("none");
  });
});

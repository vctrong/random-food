import { describe, expect, it } from "vitest";
import { countMissingFields, formatPriceInput, parsePrice, type ContributeFormSnapshot } from "./formProgress";

const empty: ContributeFormSnapshot = {
  foodImagesUploaded: 0,
  name: "",
  priceMin: null,
  priceMax: null,
  eatingLevelCount: 0,
  categoryCount: 0,
  hasProposal: false,
  restaurantMode: "existing",
  hasSelectedRestaurant: false,
  newRestaurantName: "",
  newRestaurantAddress: "",
};

describe("countMissingFields", () => {
  it("form trống thiếu đủ 6 mục (mô tả không bắt buộc)", () => {
    expect(countMissingFields(empty)).toBe(6);
  });

  it("danh mục đề xuất được tính là đã chọn danh mục", () => {
    expect(countMissingFields({ ...empty, hasProposal: true })).toBe(5);
  });

  it("quán mới tính 1 mục, cần cả tên lẫn địa chỉ", () => {
    const base = { ...empty, restaurantMode: "new" as const, newRestaurantName: "Quán Cô Ba" };
    expect(countMissingFields(base)).toBe(6);
    expect(countMissingFields({ ...base, newRestaurantAddress: "45 Mậu Thân" })).toBe(5);
  });

  it("giá đến nhỏ hơn giá từ là chưa hợp lệ", () => {
    expect(countMissingFields({ ...empty, priceMin: 30000, priceMax: 20000 })).toBe(6);
    expect(countMissingFields({ ...empty, priceMin: 20000, priceMax: 20000 })).toBe(5);
  });
});

describe("parsePrice / formatPriceInput", () => {
  it("chỉ lấy chữ số", () => {
    expect(parsePrice("25.000đ")).toBe(25000);
    expect(parsePrice("")).toBeNull();
    expect(formatPriceInput("45000")).toBe("45.000");
  });
});

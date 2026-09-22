import { describe, expect, it } from "vitest";
import type { Food } from "@/types/food";
import { applyPersonalPreferences, pickRelatedFoods, type PersonalPreferences } from "./randomLogic";

function makeFood(overrides: Partial<Food> & { id: string }): Food {
  return {
    name: "Món ăn",
    description: "",
    images: [],
    priceMin: 30000,
    priceMax: 50000,
    caloriesMin: null,
    caloriesMax: null,
    eatingLevels: ["normal"],
    tags: [],
    avgRating: 0,
    ratingCount: 0,
    categories: [],
    restaurant: null,
    ...overrides,
  };
}

const NO_PREFS: PersonalPreferences = {
  dislikedIngredients: [],
  vegetarianMode: false,
  spicePreference: null,
  priceRange: null,
  allowRepeatWithin24h: true,
};

describe("applyPersonalPreferences", () => {
  it("không lọc gì khi không có sở thích nào bật", () => {
    const foods = [makeFood({ id: "1" }), makeFood({ id: "2" })];
    expect(applyPersonalPreferences(foods, NO_PREFS)).toHaveLength(2);
  });

  it("loại món chứa từ dị ứng trong tên/mô tả/tags (không phân biệt hoa thường)", () => {
    const foods = [
      makeFood({ id: "1", name: "Bún mắm tôm đặc biệt" }),
      makeFood({ id: "2", name: "Cơm tấm sườn bì" }),
    ];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, dislikedIngredients: ["Mắm Tôm"] });
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("vegetarianMode chỉ giữ món có từ 'chay' trong tên/mô tả/tags", () => {
    const foods = [
      makeFood({ id: "1", name: "Cơm chay thập cẩm" }),
      makeFood({ id: "2", name: "Cơm tấm sườn bì" }),
    ];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, vegetarianMode: true });
    expect(result.map((f) => f.id)).toEqual(["1"]);
  });

  it("spicePreference 'khong-cay' loại món có từ 'cay'", () => {
    const foods = [
      makeFood({ id: "1", name: "Bún bò Huế", tags: ["cay"] }),
      makeFood({ id: "2", name: "Cơm tấm sườn bì" }),
    ];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, spicePreference: "khong-cay" });
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("dị ứng/chay là filter CỨNG — trả về rỗng nếu không món nào khớp, không fallback", () => {
    const foods = [makeFood({ id: "1", name: "Cơm tấm sườn bì" })];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, vegetarianMode: true });
    expect(result).toHaveLength(0);
  });

  it("priceRange lọc theo khoảng giá giao nhau, KHÔNG rỗng vẫn áp bình thường", () => {
    const foods = [
      makeFood({ id: "1", priceMin: 20000, priceMax: 30000 }),
      makeFood({ id: "2", priceMin: 100000, priceMax: 150000 }),
    ];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, priceRange: { min: 0, max: 50000 } });
    expect(result.map((f) => f.id)).toEqual(["1"]);
  });

  it("priceRange là filter MỀM — nếu áp vào làm rỗng thì bỏ qua, vẫn trả về pool gốc", () => {
    const foods = [makeFood({ id: "1", priceMin: 100000, priceMax: 150000 })];
    const result = applyPersonalPreferences(foods, { ...NO_PREFS, priceRange: { min: 0, max: 50000 } });
    expect(result.map((f) => f.id)).toEqual(["1"]);
  });

  it("allowRepeatWithin24h=false loại món vừa ăn trong 24h, trừ khi làm pool rỗng", () => {
    const foods = [makeFood({ id: "1" }), makeFood({ id: "2" })];
    const result = applyPersonalPreferences(
      foods,
      { ...NO_PREFS, allowRepeatWithin24h: false },
      ["1"],
    );
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("allowRepeatWithin24h=false nhưng loại hết thì bỏ qua filter đó (mềm)", () => {
    const foods = [makeFood({ id: "1" }), makeFood({ id: "2" })];
    const result = applyPersonalPreferences(
      foods,
      { ...NO_PREFS, allowRepeatWithin24h: false },
      ["1", "2"],
    );
    expect(result.map((f) => f.id)).toEqual(["1", "2"]);
  });
});

const RESTAURANT_A = { id: "rest-a", name: "Quán A", address: "", location: null };
const RESTAURANT_B = { id: "rest-b", name: "Quán B", address: "", location: null };
const CATEGORY_X = { id: "cat-x", name: "Cơm", slug: "com", icon: null };
const CATEGORY_Y = { id: "cat-y", name: "Bún", slug: "bun", icon: null };

describe("pickRelatedFoods", () => {
  it("ưu tiên món khác CÙNG QUÁN với món hiện tại", () => {
    const current = makeFood({ id: "1", restaurant: RESTAURANT_A, categories: [CATEGORY_X] });
    const foods = [
      current,
      makeFood({ id: "2", restaurant: RESTAURANT_A }),
      makeFood({ id: "3", restaurant: RESTAURANT_B, categories: [CATEGORY_X] }),
    ];
    const result = pickRelatedFoods(foods, current);
    expect(result.reason).toBe("same-restaurant");
    expect(result.foods.map((f) => f.id)).toEqual(["2"]);
  });

  it("fallback sang CÙNG DANH MỤC nếu quán chỉ có đúng món hiện tại", () => {
    const current = makeFood({ id: "1", restaurant: RESTAURANT_A, categories: [CATEGORY_X] });
    const foods = [
      current,
      makeFood({ id: "2", restaurant: RESTAURANT_B, categories: [CATEGORY_X] }),
      makeFood({ id: "3", restaurant: RESTAURANT_B, categories: [CATEGORY_Y] }),
    ];
    const result = pickRelatedFoods(foods, current);
    expect(result.reason).toBe("same-category");
    expect(result.foods.map((f) => f.id)).toEqual(["2"]);
  });

  it("trả về rỗng (reason='none') nếu không có quán lẫn danh mục chung", () => {
    const current = makeFood({ id: "1", restaurant: RESTAURANT_A, categories: [CATEGORY_X] });
    const foods = [current, makeFood({ id: "2", restaurant: RESTAURANT_B, categories: [CATEGORY_Y] })];
    const result = pickRelatedFoods(foods, current);
    expect(result.reason).toBe("none");
    expect(result.foods).toHaveLength(0);
  });

  it("giới hạn đúng số lượng `count`", () => {
    const current = makeFood({ id: "1", restaurant: RESTAURANT_A });
    const foods = [
      current,
      makeFood({ id: "2", restaurant: RESTAURANT_A }),
      makeFood({ id: "3", restaurant: RESTAURANT_A }),
      makeFood({ id: "4", restaurant: RESTAURANT_A }),
    ];
    const result = pickRelatedFoods(foods, current, 2);
    expect(result.foods).toHaveLength(2);
  });
});

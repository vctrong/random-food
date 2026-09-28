import { describe, expect, it } from "vitest";
import { applyGeocodeResult, applyUserPin, pickDuplicateCandidate } from "./locationLogic";
import type { RestaurantOption } from "@/types/restaurant";

const point = { lat: 10.03, lng: 105.77 };

function restaurant(id: string, name: string, distanceMeters: number): RestaurantOption {
  return { id, name, address: "", image: null, location: point, distanceMeters };
}

describe("applyGeocodeResult", () => {
  it("geocode thành công khi chưa ghim → geocoded", () => {
    expect(applyGeocodeResult({ location: null, source: "none" }, point)).toEqual({ location: point, source: "geocoded" });
  });

  it("geocode thất bại → none (bỏ ghim cũ của địa chỉ cũ)", () => {
    expect(applyGeocodeResult({ location: point, source: "geocoded" }, null)).toEqual({ location: null, source: "none" });
  });

  it("không ghi đè ghim user đã tự đặt", () => {
    const pinned = applyUserPin(point);
    expect(applyGeocodeResult(pinned, { lat: 1, lng: 1 })).toBe(pinned);
    expect(applyGeocodeResult(applyUserPin(point, true), null).source).toBe("gps");
  });
});

describe("pickDuplicateCandidate", () => {
  const nearby = [restaurant("a", "Cơm Tấm Sài Gòn", 20), restaurant("b", "Hủ Tiếu Cô Ba", 45), restaurant("c", "Bún Bò", 120)];

  it("ưu tiên quán tên giống trong 50m", () => {
    expect(pickDuplicateCandidate(nearby, "hu tieu co ba", new Set())?.id).toBe("b");
  });

  it("không trùng tên thì lấy quán gần nhất trong 50m", () => {
    expect(pickDuplicateCandidate(nearby, "Quán mới toanh", new Set())?.id).toBe("a");
  });

  it("bỏ quán đã bấm 'Không phải' và quán ngoài 50m", () => {
    expect(pickDuplicateCandidate(nearby, "", new Set(["a", "b"]))).toBeNull();
  });
});

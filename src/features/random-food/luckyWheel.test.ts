import { describe, expect, it } from "vitest";
import { sliceAtPointer, wheelTargetRotation } from "./luckyWheel";

describe("wheelTargetRotation", () => {
  it.each([0, 1, 2, 3])("dừng đúng tâm lát %i dưới kim chỉ", (index) => {
    const rotation = wheelTargetRotation(0, index, 4, 5);
    expect(sliceAtPointer(rotation, 4)).toBe(index);
    // Tâm lát: lệch nửa lát (45°) so với mép.
    expect(((-rotation % 90) + 90) % 90).toBeCloseTo(45);
  });

  it("luôn quay tới ít nhất fullTurns vòng so với góc hiện tại", () => {
    const current = 1234;
    const rotation = wheelTargetRotation(current, 2, 4, 4);
    expect(rotation).toBeGreaterThanOrEqual(current + 4 * 360);
    expect(rotation).toBeLessThan(current + 5 * 360);
    expect(sliceAtPointer(rotation, 4)).toBe(2);
  });
});

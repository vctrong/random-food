import { describe, expect, it } from "vitest";
import { buildIdleStrip, buildReelStrip, reelOffsetPercent } from "./slotReel";

function sequenceRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildReelStrip", () => {
  it("bắt đầu bằng nhãn đang hiện ở vị trí 1 và kết thúc bằng nhãn trúng ở vị trí áp chót", () => {
    const strip = buildReelStrip(["A", "B", "C"], "A", "C", 6, sequenceRng([0.1, 0.6, 0.9]));
    expect(strip[1]).toBe("A");
    expect(strip[strip.length - 2]).toBe("C");
    expect(strip).toHaveLength(6 + 4);
  });

  it("không có 2 nhãn giống nhau đứng liền nhau khi pool có từ 2 nhãn trở lên", () => {
    const strip = buildReelStrip(["A", "B"], "A", "B", 10, sequenceRng([0, 0.5, 0.99]));
    for (let i = 1; i < strip.length; i += 1) {
      expect(strip[i]).not.toBe(strip[i - 1]);
    }
  });

  it("pool chỉ 1 nhãn vẫn dựng được dải", () => {
    const strip = buildReelStrip(["A"], "?", "A", 3);
    expect(strip[1]).toBe("?");
    expect(strip[strip.length - 2]).toBe("A");
  });
});

describe("buildIdleStrip / reelOffsetPercent", () => {
  it("dải chờ có dấu ? ở giữa", () => {
    expect(buildIdleStrip(["A", "B"])).toEqual(["A", "?", "B"]);
  });

  it("dòng 1 → offset 0, dòng cuối-1 → dịch lên đúng phần trăm", () => {
    expect(reelOffsetPercent(1, 10)).toBeCloseTo(0);
    expect(reelOffsetPercent(8, 10)).toBe(-70);
  });
});

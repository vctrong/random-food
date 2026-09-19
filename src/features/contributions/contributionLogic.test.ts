import { describe, expect, it } from "vitest";
import {
  deriveContributionStatus,
  filterContributions,
  getAchievementProgress,
  getContributorLevel,
  summarizeContributions,
} from "./contributionLogic";
import type { Contribution } from "@/types/contribution";

function makeContribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "1",
    name: "Bún bò",
    description: "",
    images: [],
    priceMin: null,
    priceMax: null,
    eatingLevels: ["normal"],
    categories: [],
    status: "approved",
    foodStatus: "approved",
    moderationNote: null,
    restaurant: null,
    verifiedByName: null,
    verifiedAt: null,
    verificationNote: null,
    saveCount: 0,
    avgRating: 0,
    ratingCount: 0,
    feedbackHistory: [],
    editable: { food: false, restaurant: false },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deriveContributionStatus", () => {
  it("ưu tiên needs_revision của quán do user tạo kèm dù món đã duyệt", () => {
    expect(deriveContributionStatus("approved", "visible", "needs_revision")).toBe("needs_revision");
  });

  it("chỉ approved khi cả món và quán đều approved", () => {
    expect(deriveContributionStatus("approved", "visible", "pending")).toBe("pending");
    expect(deriveContributionStatus("approved", "visible", "approved")).toBe("approved");
  });

  it("hidden chỉ áp dụng cho món đã duyệt bị Admin ẩn", () => {
    expect(deriveContributionStatus("approved", "hidden", null)).toBe("hidden");
    expect(deriveContributionStatus("pending", "hidden", null)).toBe("pending");
  });
});

describe("getContributorLevel", () => {
  it("0 món duyệt → cấp 1, tiến độ 0%", () => {
    const result = getContributorLevel(0);
    expect(result.current.level).toBe(1);
    expect(result.next?.level).toBe(2);
    expect(result.percent).toBe(0);
    expect(result.remaining).toBe(1);
  });

  it("đúng ngưỡng thì lên cấp", () => {
    expect(getContributorLevel(3).current.level).toBe(3);
    expect(getContributorLevel(10).current.level).toBe(5);
  });

  it("tính % giữa 2 cấp", () => {
    // Cấp 3 (3 món) → cấp 4 (6 món): 4 món = 1/3 quãng đường.
    expect(getContributorLevel(4).percent).toBe(33);
  });

  it("cấp cao nhất không còn cấp kế tiếp", () => {
    const result = getContributorLevel(99);
    expect(result.next).toBeNull();
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });
});

describe("summarize / filter", () => {
  const list = [
    makeContribution({ id: "a", name: "Cơm tấm", status: "approved" }),
    makeContribution({ id: "b", name: "Hủ tiếu", status: "pending" }),
    makeContribution({ id: "c", name: "Bún mắm", status: "needs_revision" }),
  ];

  it("đếm theo trạng thái", () => {
    expect(summarizeContributions(list)).toEqual({ total: 3, approved: 1, pending: 1, needsRevision: 1, rejected: 0 });
  });

  it("lọc theo tab và tìm kiếm không phân biệt hoa thường", () => {
    expect(filterContributions(list, "pending", "").map((item) => item.id)).toEqual(["b"]);
    expect(filterContributions(list, "all", "CƠM").map((item) => item.id)).toEqual(["a"]);
  });
});

describe("getAchievementProgress", () => {
  it("chỉ tính món approved khi mở khoá thành tựu", () => {
    const list = [makeContribution({ status: "pending", saveCount: 50 })];
    const unlocked = getAchievementProgress(list).filter((item) => item.unlocked);
    expect(unlocked).toEqual([]);
  });

  it("mở khoá món đầu tay và được yêu thích", () => {
    const list = [makeContribution({ saveCount: 12 })];
    const unlockedIds = getAchievementProgress(list)
      .filter((item) => item.unlocked)
      .map((item) => item.id);
    expect(unlockedIds).toEqual(["first_approved", "loved_by_many"]);
  });
});

import { describe, expect, it } from "vitest";
import { COMMITMENTS } from "@/constants/reviewerApplication";
import { computeApplicationAccess, countWords, getApplicationProgress, validateApplicationFields } from "./applicationLogic";
import type { ReviewerApplicationFields } from "@/types/reviewerApplication";

const words = (count: number) => Array.from({ length: count }, (_, i) => `từ${i}`).join(" ");

function validFields(overrides: Partial<ReviewerApplicationFields> = {}): ReviewerApplicationFields {
  return {
    fullName: "Nguyễn Văn A",
    motivation: "Tôi muốn góp phần giữ thông tin món ăn trên app chính xác.",
    expertiseCategoryIds: ["c1", "c2"],
    activeAreas: ["Ninh Kiều"],
    socialLinks: [],
    portfolioCount: 2,
    scenarioAnswer: words(200),
    acceptedCommitmentIds: COMMITMENTS.map((commitment) => commitment.id),
    ...overrides,
  };
}

describe("countWords", () => {
  it("đếm từ, bỏ qua khoảng trắng thừa", () => {
    expect(countWords("  một   hai\nba ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });
});

describe("computeApplicationAccess", () => {
  const now = new Date("2026-09-20T00:00:00.000Z");

  it("reviewer/admin không nộp được", () => {
    expect(computeApplicationAccess({ role: "foodreviewer", latest: null, now }).state).toBe("already_reviewer");
    expect(computeApplicationAccess({ role: "admin", latest: null, now }).state).toBe("already_reviewer");
  });

  it("user chưa có đơn hoặc đã rút đơn thì nộp được ngay", () => {
    expect(computeApplicationAccess({ role: "user", latest: null, now }).state).toBe("eligible");
    expect(computeApplicationAccess({ role: "user", latest: { status: "withdrawn", reviewedAt: null }, now }).state).toBe("eligible");
  });

  it("đơn pending chặn nộp thêm", () => {
    expect(computeApplicationAccess({ role: "user", latest: { status: "pending", reviewedAt: null }, now }).state).toBe("pending");
  });

  it("bị từ chối: chờ 30 ngày rồi mới nộp lại", () => {
    const rejectedRecently = { status: "rejected" as const, reviewedAt: "2026-09-10T00:00:00.000Z" };
    const result = computeApplicationAccess({ role: "user", latest: rejectedRecently, now });
    expect(result).toEqual({ state: "cooldown", until: "2026-10-10T00:00:00.000Z" });

    const rejectedLongAgo = { status: "rejected" as const, reviewedAt: "2026-08-01T00:00:00.000Z" };
    expect(computeApplicationAccess({ role: "user", latest: rejectedLongAgo, now }).state).toBe("eligible");
  });
});

describe("validateApplicationFields", () => {
  it("hợp lệ khi đủ dữ liệu", () => {
    expect(validateApplicationFields(validFields())).toEqual({});
  });

  it("báo lỗi từng field", () => {
    const errors = validateApplicationFields(
      validFields({
        fullName: " ",
        motivation: "ngắn",
        expertiseCategoryIds: ["c1"],
        activeAreas: [],
        socialLinks: [{ platform: "tiktok", url: "tiktok.com/abc" }],
        portfolioCount: 1,
        scenarioAnswer: words(10),
        acceptedCommitmentIds: [],
      }),
    );
    expect(Object.keys(errors).sort()).toEqual(
      ["activeAreas", "commitments", "expertiseCategoryIds", "fullName", "motivation", "portfolio", "scenarioAnswer", "socialLinks"].sort(),
    );
  });

  it("chặn bài trả lời vượt 400 từ và ảnh vượt 6", () => {
    const errors = validateApplicationFields(validFields({ scenarioAnswer: words(401), portfolioCount: 7 }));
    expect(errors.scenarioAnswer).toBeDefined();
    expect(errors.portfolio).toBeDefined();
  });

  it("thiếu 1 cam kết là không hợp lệ", () => {
    expect(validateApplicationFields(validFields({ acceptedCommitmentIds: ["integrity"] })).commitments).toBeDefined();
  });
});

describe("getApplicationProgress", () => {
  it("đánh dấu từng phần hoàn thành", () => {
    const progress = getApplicationProgress(validFields({ portfolioCount: 0, acceptedCommitmentIds: [] }));
    expect(progress).toEqual({ profile: true, channels: false, scenario: true, commitments: false });
  });
});

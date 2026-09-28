import { describe, expect, it } from "vitest";
import {
  buildOrphanSearchExpression,
  chunk,
  folderOfPublicId,
  isAuthorizedCronRequest,
  isInsideMediaRoot,
  isOldEnough,
  isValidFolderName,
  orphanReferenceDate,
} from "./cleanupRules";

const NOW = new Date("2026-09-29T00:00:00Z");

describe("cleanupRules", () => {
  it("mốc tuổi: ưu tiên unattached_at (phẳng hoặc custom), không có / sai thì ngày upload", () => {
    const created = "2026-09-01T00:00:00Z";
    expect(orphanReferenceDate({ created_at: created }).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(orphanReferenceDate({ created_at: created, context: { unattached_at: "2026-09-28T00:00:00Z" } }).toISOString()).toBe(
      "2026-09-28T00:00:00.000Z",
    );
    expect(
      orphanReferenceDate({ created_at: created, context: { custom: { unattached_at: "2026-09-27T00:00:00Z" } } }).toISOString(),
    ).toBe("2026-09-27T00:00:00.000Z");
    expect(orphanReferenceDate({ created_at: created, context: { unattached_at: "rác" } }).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("ảnh upload lâu nhưng vừa bị gỡ khỏi bài KHÔNG bị tính là rác ngay", () => {
    const reference = orphanReferenceDate({ created_at: "2026-01-01T00:00:00Z", context: { unattached_at: "2026-09-28T12:00:00Z" } });
    expect(isOldEnough(reference, NOW, 3)).toBe(false);
    expect(isOldEnough(new Date("2026-09-26T00:00:00Z"), NOW, 3)).toBe(true);
    expect(isOldEnough(new Date("2026-09-26T00:00:01Z"), NOW, 3)).toBe(false);
  });

  it("biểu thức tìm kiếm + phạm vi thư mục", () => {
    expect(buildOrphanSearchExpression("unattached")).toBe("tags=unattached AND public_id:nayangi/*");
    expect(buildOrphanSearchExpression("unattached", "foods")).toBe("tags=unattached AND public_id:nayangi/foods/*");
    expect(isInsideMediaRoot("nayangi/foods/a", "foods")).toBe(true);
    expect(isInsideMediaRoot("nayangi/foodsx/a", "foods")).toBe(false);
    expect(isInsideMediaRoot("khac/foods/a")).toBe(false);
    expect(folderOfPublicId("nayangi/announcements/abc")).toBe("announcements");
    expect(folderOfPublicId("nayangi/abc")).toBe("(gốc)");
  });

  it("tên thư mục hợp lệ", () => {
    expect(isValidFolderName("announcements")).toBe(true);
    expect(isValidFolderName("reviewer-applications")).toBe(true);
    expect(isValidFolderName("a b")).toBe(false);
    expect(isValidFolderName("foods/*")).toBe(false);
    expect(isValidFolderName("")).toBe(false);
  });

  it("chia lô", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 100)).toEqual([]);
  });

  it("cron: chỉ nhận đúng Bearer <CRON_SECRET>, thiếu/ngắn secret thì luôn từ chối", () => {
    const secret = "s".repeat(32);
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCronRequest(`bearer ${secret}`, secret)).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer short", "short")).toBe(false);
  });
});

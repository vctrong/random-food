import { describe, expect, it } from "vitest";
import {
  CLAIM_TTL_MS,
  MAX_PENDING_EDITS,
  SUBMISSION_STATUSES,
  canTransition,
  claimCutoff,
  findBlockedFields,
  getEditPermission,
  isClaimExpired,
  remainingEdits,
  sourceStatuses,
  type SubmissionActor,
  type SubmissionStatus,
} from "./submissionRules";

describe("canTransition — chuyển trạng thái hợp lệ", () => {
  const allowed: [string, SubmissionStatus, SubmissionActor][] = [
    ["pending", "in_review", "reviewer"],
    ["pending", "withdrawn", "owner"],
    ["in_review", "approved", "reviewer"],
    ["in_review", "rejected", "reviewer"],
    ["in_review", "needs_revision", "reviewer"],
    ["in_review", "withdrawn", "owner"],
    ["in_review", "pending", "reviewer"],
    ["in_review", "pending", "system"],
    ["needs_revision", "pending", "owner"],
    ["needs_revision", "withdrawn", "owner"],
    ["pending", "approved", "admin"],
    ["in_review", "rejected", "admin"],
  ];
  it.each(allowed)("%s → %s bởi %s", (from, to, actor) => {
    expect(canTransition(from, to, actor)).toBe(true);
  });
});

describe("canTransition — chặn mọi chuyển khác", () => {
  const blocked: [string, SubmissionStatus, SubmissionActor][] = [
    ["pending", "approved", "reviewer"], // phải nhận xác minh trước
    ["pending", "in_review", "owner"],
    ["in_review", "approved", "owner"],
    ["in_review", "in_review", "reviewer"],
    ["needs_revision", "approved", "reviewer"],
    ["needs_revision", "in_review", "reviewer"],
    ["approved", "withdrawn", "owner"],
    ["rejected", "pending", "owner"],
    ["withdrawn", "pending", "owner"],
    ["approved", "pending", "system"],
    ["needs_revision", "pending", "admin"],
  ];
  it.each(blocked)("%s → %s bởi %s", (from, to, actor) => {
    expect(canTransition(from, to, actor)).toBe(false);
  });

  it("trạng thái kết thúc không đi đâu được nữa", () => {
    for (const terminal of ["approved", "rejected", "withdrawn"]) {
      for (const to of SUBMISSION_STATUSES) {
        for (const actor of ["owner", "reviewer", "admin", "system"] as SubmissionActor[]) {
          expect(canTransition(terminal, to, actor)).toBe(false);
        }
      }
    }
  });
});

describe("sourceStatuses — điều kiện $in cho update có điều kiện", () => {
  it("user rút được từ pending / in_review / needs_revision", () => {
    expect(sourceStatuses("withdrawn", "owner").sort()).toEqual(["in_review", "needs_revision", "pending"]);
  });
  it("admin quyết định được từ pending / in_review", () => {
    expect(sourceStatuses("approved", "admin").sort()).toEqual(["in_review", "pending"]);
  });
  it("reviewer chỉ nhả từ in_review", () => {
    expect(sourceStatuses("pending", "reviewer")).toEqual(["in_review"]);
  });
});

describe("quyền sửa theo trạng thái và nhóm field", () => {
  it("PENDING sửa được cả 2 nhóm", () => {
    expect(getEditPermission("pending")).toEqual({ light: true, heavy: true });
    expect(findBlockedFields("pending", ["name", "price", "restaurant"])).toEqual([]);
  });

  it("IN_REVIEW không sửa được gì", () => {
    expect(findBlockedFields("in_review", ["name", "restaurant"])).toEqual(["name", "restaurant"]);
  });

  it("NEEDS_CHANGES chỉ nhóm nhẹ — chặn quán/địa chỉ/vị trí", () => {
    expect(findBlockedFields("needs_revision", ["name", "images", "restaurant"])).toEqual(["restaurant"]);
  });

  it("APPROVED / REJECTED / WITHDRAWN chỉ xem", () => {
    for (const status of ["approved", "rejected", "withdrawn"]) {
      expect(getEditPermission(status)).toEqual({ light: false, heavy: false });
    }
  });
});

describe("giới hạn số lần sửa", () => {
  it(`còn lại = ${MAX_PENDING_EDITS} − editCount, không âm`, () => {
    expect(remainingEdits("pending", 0)).toBe(MAX_PENDING_EDITS);
    expect(remainingEdits("pending", MAX_PENDING_EDITS - 1)).toBe(1);
    expect(remainingEdits("pending", MAX_PENDING_EDITS + 2)).toBe(0);
  });
  it("needs_revision không giới hạn (null)", () => {
    expect(remainingEdits("needs_revision", 5)).toBeNull();
  });
});

describe("hạn giữ đề xuất", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("đúng mốc 48h là hết hạn, trước đó còn hạn", () => {
    expect(isClaimExpired(new Date(now.getTime() - CLAIM_TTL_MS + 1000), now)).toBe(false);
    expect(isClaimExpired(new Date(now.getTime() - CLAIM_TTL_MS), now)).toBe(true);
    expect(isClaimExpired(null, now)).toBe(true);
  });
  it("cutoff = now − 48h", () => {
    expect(claimCutoff(now).getTime()).toBe(now.getTime() - CLAIM_TTL_MS);
  });
});

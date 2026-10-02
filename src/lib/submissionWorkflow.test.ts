import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Test luồng xác minh bằng model giả lập trong bộ nhớ (không cần MongoDB): fake hiểu đúng
 * các toán tử filter/update mà service dùng, và mỗi findOneAndUpdate chạy trọn trong 1 lượt
 * như Mongo — nên 2 thao tác đồng thời chỉ 1 bên khớp điều kiện.
 */

type Doc = Record<string, unknown>;

const h = vi.hoisted(() => {
  const same = (a: unknown, b: unknown) => (a === undefined || b === undefined ? a === b : String(a) === String(b));

  function matches(doc: Doc, filter: Doc): boolean {
    return Object.entries(filter).every(([key, cond]) => {
      if (key === "$or") return (cond as Doc[]).some((sub) => matches(doc, sub));
      const value = doc[key];
      const isOperator = cond !== null && typeof cond === "object" && !(cond instanceof Date) && Object.keys(cond).some((k) => k.startsWith("$"));
      if (!isOperator) return same(value, cond);
      return Object.entries(cond as Doc).every(([op, arg]) => {
        if (op === "$ne") return !same(value, arg);
        if (op === "$in") return (arg as unknown[]).some((item) => same(value, item));
        if (op === "$nin") return !(arg as unknown[]).some((item) => same(value, item));
        if (op === "$lt") return value !== undefined && (value as number) < (arg as number);
        if (op === "$gte") return value !== undefined && (value as number) >= (arg as number);
        throw new Error(`fake: toán tử chưa hỗ trợ ${op}`);
      });
    });
  }

  function applyUpdate(doc: Doc, update: Doc) {
    Object.assign(doc, (update.$set as Doc) ?? {});
    for (const key of Object.keys((update.$unset as Doc) ?? {})) delete doc[key];
    for (const [key, by] of Object.entries((update.$inc as Doc) ?? {})) doc[key] = ((doc[key] as number) ?? 0) + (by as number);
  }

  const chain = <T,>(value: T) => {
    const query = { select: () => query, sort: () => query, lean: async () => value, then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve) };
    return query;
  };

  function createModel() {
    const docs: Doc[] = [];
    return {
      docs,
      findOneAndUpdate(filter: Doc, update: Doc, options: { new?: boolean } = {}) {
        const doc = docs.find((item) => matches(item, filter));
        if (!doc) return chain(null);
        const before = structuredClone(doc);
        applyUpdate(doc, update);
        return chain(options.new ? structuredClone(doc) : before);
      },
      findById: (id: unknown) => chain(docs.find((item) => same(item._id, id)) ?? null),
      findOne: (filter: Doc) => chain(docs.find((item) => matches(item, filter)) ?? null),
      exists: async (filter: Doc) => (docs.some((item) => matches(item, filter)) ? { _id: "x" } : null),
      updateOne: async (filter: Doc, update: Doc) => {
        const doc = docs.find((item) => matches(item, filter));
        if (doc) applyUpdate(doc, update);
        return { modifiedCount: doc ? 1 : 0 };
      },
    };
  }

  return {
    Food: createModel(),
    Restaurant: createModel(),
    auditLogs: [] as Doc[],
    notes: [] as Doc[],
    notifications: [] as { recipientId: string; type: string; payload: Doc }[],
    hooks: { beforeCategoryCheck: null as null | (() => void) },
  };
});

vi.mock("@/lib/mongodb", () => ({ connectDB: async () => undefined }));
vi.mock("@/lib/models/Food", () => ({ Food: h.Food }));
vi.mock("@/lib/models/Restaurant", () => ({ Restaurant: h.Restaurant }));
vi.mock("@/lib/models/AuditLog", () => ({
  AuditLog: {
    create: async (doc: Doc) => h.auditLogs.push(doc),
    findOne: () => ({ sort: () => ({ select: () => ({ lean: async () => null }) }) }),
  },
}));
vi.mock("@/lib/models/User", () => ({ User: {} }));
vi.mock("@/lib/models/CategoryProposal", () => ({ CategoryProposal: {} }));
vi.mock("@/lib/models/SubmissionNote", () => ({
  SubmissionNote: { create: async (doc: Doc) => (h.notes.push(doc), { _id: `note-${h.notes.length}`, ...doc }) },
}));
vi.mock("@/lib/notifications/notify", () => ({
  notify: async (recipientId: string, input: { type: string; payload: Doc }) =>
    h.notifications.push({ recipientId, type: input.type, payload: input.payload }),
}));
vi.mock("@/lib/categoryProposals", () => ({ getFallbackCategoryId: async () => "cat-khac" }));
vi.mock("@/lib/categoryCounts", () => ({ recountCategoriesOfFood: async () => undefined }));
vi.mock("@/lib/achievements", () => ({ getContributionOverview: async () => undefined }));
vi.mock("@/lib/foodSubmission", () => ({
  validateFoodCategories: async () => {
    h.hooks.beforeCategoryCheck?.();
    return null;
  },
}));
vi.mock("@/lib/cloudinary", () => ({
  markImagesUnattached: async () => undefined,
  parseOwnUploadUrl: () => null,
  uploadImageFile: async () => "https://res.cloudinary.com/demo/image/upload/nayangi/foods/new.jpg",
}));
vi.mock("@/lib/rateLimit", () => ({ hitRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/submissionClaims", () => ({ releaseExpiredClaims: async () => 0 }));

import {
  addSubmissionNote,
  claimSubmission,
  decideSubmission,
  editSubmission,
  releaseSubmission,
  withdrawSubmission,
  type SubmissionEditInput,
} from "./submissionWorkflow";
import { CLAIM_TTL_MS, MAX_PENDING_EDITS } from "@/features/contributions/submissionRules";

const FOOD_ID = "a00000000000000000000001";
const NOW = new Date("2026-10-02T12:00:00Z");
const OWNER = "user-owner";
const REVIEWER_A = "reviewer-a";
const REVIEWER_B = "reviewer-b";
const ADMIN = "admin-1";

function seedFood(overrides: Doc = {}): Doc {
  const food: Doc = {
    _id: FOOD_ID,
    name: "Bún mắm",
    createdBy: OWNER,
    restaurantId: "rest-1",
    moderationStatus: "pending",
    visibility: "visible",
    editCount: 0,
    categoryIds: ["cat-bun"],
    images: ["https://res.cloudinary.com/demo/image/upload/nayangi/foods/a.jpg"],
    ...overrides,
  };
  h.Food.docs.push(food);
  return food;
}

function seedRestaurant(overrides: Doc = {}): Doc {
  const restaurant: Doc = { _id: "rest-1", name: "Quán Cô Ba", createdBy: OWNER, moderationStatus: "pending", ...overrides };
  h.Restaurant.docs.push(restaurant);
  return restaurant;
}

const lightEdit = (name = "Bún mắm sửa"): SubmissionEditInput => ({
  food: {
    name,
    description: "",
    priceMin: 30000,
    priceMax: 45000,
    categoryIds: ["cat-bun"],
    eatingLevels: ["normal"],
    keepImages: ["https://res.cloudinary.com/demo/image/upload/nayangi/foods/a.jpg"],
    newImages: [],
  },
});

const restaurantEdit: SubmissionEditInput = {
  restaurant: { name: "Quán Cô Ba", address: "12 Mậu Thân", location: null, locationSource: "none" },
};

beforeEach(() => {
  h.Food.docs.length = 0;
  h.Restaurant.docs.length = 0;
  h.auditLogs.length = 0;
  h.notes.length = 0;
  h.notifications.length = 0;
  h.hooks.beforeCategoryCheck = null;
});

describe("nhận xác minh", () => {
  it("2 reviewer nhận cùng lúc → chỉ 1 người thắng, người kia nhận lỗi rõ ràng", async () => {
    const food = seedFood();
    const [a, b] = await Promise.all([claimSubmission(REVIEWER_A, FOOD_ID, NOW), claimSubmission(REVIEWER_B, FOOD_ID, NOW)]);

    const results = [a.error, b.error];
    expect(results.filter((error) => error === null)).toHaveLength(1);
    expect(results).toContain("ALREADY_TAKEN");
    expect(food.moderationStatus).toBe("in_review");
    expect(food.reviewerId).toBe(a.error === null ? REVIEWER_A : REVIEWER_B);
    expect(h.notifications.filter((item) => item.type === "submission_claimed")).toHaveLength(1);
  });

  it("không tự nhận đề xuất của chính mình", async () => {
    seedFood();
    expect((await claimSubmission(OWNER, FOOD_ID, NOW)).error).toBe("SELF_SUBMITTED");
  });

  it("đề xuất đã rút thì không nhận được", async () => {
    seedFood({ moderationStatus: "withdrawn" });
    expect((await claimSubmission(REVIEWER_A, FOOD_ID, NOW)).error).toBe("ALREADY_TAKEN");
  });

  it("người khác giữ quá 48h thì nhận lại được", async () => {
    const food = seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_B, claimedAt: new Date(NOW.getTime() - CLAIM_TTL_MS - 1) });
    expect((await claimSubmission(REVIEWER_A, FOOD_ID, NOW)).error).toBeNull();
    expect(food.reviewerId).toBe(REVIEWER_A);
  });

  it("người khác đang giữ còn hạn thì không nhận được", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_B, claimedAt: NOW });
    expect((await claimSubmission(REVIEWER_A, FOOD_ID, NOW)).error).toBe("ALREADY_TAKEN");
  });

  it("chỉ người đang giữ mới nhả được, nhả xong về pending", async () => {
    const food = seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    expect((await releaseSubmission(REVIEWER_B, FOOD_ID, NOW)).error).toBe("NOT_HOLDER");
    expect((await releaseSubmission(REVIEWER_A, FOOD_ID, NOW)).error).toBeNull();
    expect(food.moderationStatus).toBe("pending");
    expect(food.reviewerId).toBeUndefined();
  });
});

describe("quyết định", () => {
  it("reviewer phải nhận trước — pending không duyệt thẳng được", async () => {
    seedFood();
    const result = await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "approved", note: "", now: NOW });
    expect(result.error).toBe("NOT_HOLDER");
  });

  it("reviewer không giữ đề xuất thì không thao tác được", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_B, claimedAt: NOW });
    const result = await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "rejected", note: "sai", now: NOW });
    expect(result.error).toBe("NOT_HOLDER");
  });

  it("quá hạn giữ thì không quyết định được nữa", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: new Date(NOW.getTime() - CLAIM_TTL_MS - 1) });
    const result = await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "approved", note: "", now: NOW });
    expect(result.error).toBe("CLAIM_EXPIRED");
  });

  it("yêu cầu chỉnh sửa bắt buộc có lý do và lưu lý do cho user", async () => {
    const food = seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const base = { actorId: REVIEWER_A, actorRole: "reviewer" as const, foodId: FOOD_ID, decision: "needs_revision" as const, now: NOW };
    expect((await decideSubmission({ ...base, note: "  " })).error).toBe("REASON_REQUIRED");
    expect((await decideSubmission({ ...base, note: "Ảnh mờ" })).error).toBeNull();
    expect(food.moderationStatus).toBe("needs_revision");
    expect(food.moderationNote).toBe("Ảnh mờ");
    expect(food.reviewerId).toBeUndefined();
    // Quán mới giữ pending khi chỉ yêu cầu sửa món.
  });

  it("duyệt món → duyệt luôn quán mới đi kèm", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const restaurant = seedRestaurant();
    expect((await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "approved", note: "", now: NOW })).error).toBeNull();
    expect(restaurant.moderationStatus).toBe("approved");
  });

  it("từ chối món → chỉ từ chối quán khi không còn món nào khác đang dùng", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    seedFood({ _id: "a00000000000000000000002", moderationStatus: "pending" });
    const restaurant = seedRestaurant();
    await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "rejected", note: "Không có thật", now: NOW });
    expect(restaurant.moderationStatus).toBe("pending");

    h.Food.docs[1].moderationStatus = "withdrawn";
    h.Food.docs[0].moderationStatus = "in_review";
    h.Food.docs[0].reviewerId = REVIEWER_A;
    h.Food.docs[0].claimedAt = NOW;
    await decideSubmission({ actorId: REVIEWER_A, actorRole: "reviewer", foodId: FOOD_ID, decision: "rejected", note: "Không có thật", now: NOW });
    expect(restaurant.moderationStatus).toBe("rejected");
  });

  it("Admin quyết định đề xuất reviewer khác đang giữ → báo reviewer + AuditLog riêng", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const result = await decideSubmission({ actorId: ADMIN, actorRole: "admin", foodId: FOOD_ID, decision: "approved", note: "", now: NOW });
    expect(result.error).toBeNull();
    expect(h.auditLogs.map((log) => log.action)).toContain("admin_override_decision");
    expect(h.notifications).toContainEqual(expect.objectContaining({ recipientId: REVIEWER_A, type: "submission_overridden" }));
  });

  it("Admin không quyết định được đề xuất đã rút", async () => {
    seedFood({ moderationStatus: "withdrawn" });
    const result = await decideSubmission({ actorId: ADMIN, actorRole: "admin", foodId: FOOD_ID, decision: "approved", note: "", now: NOW });
    expect(result.error).toBe("INVALID_TRANSITION");
  });
});

describe("rút đề xuất", () => {
  it("rút khi đang xác minh → báo reviewer đang giữ, quán mới cũng rút", async () => {
    const food = seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const restaurant = seedRestaurant();
    expect((await withdrawSubmission(OWNER, FOOD_ID, NOW)).error).toBeNull();
    expect(food.moderationStatus).toBe("withdrawn");
    expect(food.reviewerId).toBeUndefined();
    expect(restaurant.moderationStatus).toBe("withdrawn");
    expect(h.notifications).toContainEqual(expect.objectContaining({ recipientId: REVIEWER_A, type: "submission_withdrawn" }));
  });

  it("chỉ chủ đề xuất được rút; đã duyệt thì không rút được", async () => {
    seedFood({ moderationStatus: "pending" });
    expect((await withdrawSubmission("someone-else", FOOD_ID, NOW)).error).toBe("NOT_FOUND");
    h.Food.docs[0].moderationStatus = "approved";
    expect((await withdrawSubmission(OWNER, FOOD_ID, NOW)).error).toBe("INVALID_TRANSITION");
  });
});

describe("sửa đề xuất", () => {
  it("IN_REVIEW: chặn mọi field và nêu rõ field bị chặn", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const result = await editSubmission(OWNER, FOOD_ID, { ...lightEdit(), requestedFields: ["name", "price"] }, NOW);
    expect(result.error).toBe("FIELDS_BLOCKED");
    expect("blockedFields" in result && result.blockedFields).toEqual(["name", "price"]);
  });

  it("NEEDS_CHANGES: chặn nhóm nặng (quán / địa chỉ / vị trí)", async () => {
    seedFood({ moderationStatus: "needs_revision" });
    seedRestaurant();
    const result = await editSubmission(OWNER, FOOD_ID, restaurantEdit, NOW);
    expect(result.error).toBe("FIELDS_BLOCKED");
    expect("blockedFields" in result && result.blockedFields).toEqual(["restaurant"]);
  });

  it("NEEDS_CHANGES: sửa nhóm nhẹ là gửi lại → pending, reset editCount, xoá lý do", async () => {
    const food = seedFood({ moderationStatus: "needs_revision", editCount: 2, moderationNote: "Ảnh mờ" });
    const result = await editSubmission(OWNER, FOOD_ID, lightEdit(), NOW);
    expect(result.error).toBeNull();
    expect(food.moderationStatus).toBe("pending");
    expect(food.editCount).toBe(0);
    expect(food.moderationNote).toBeUndefined();
    expect(food.name).toBe("Bún mắm sửa");
  });

  it(`PENDING: mỗi lần sửa +1, tới ${MAX_PENDING_EDITS} lần thì báo hết lượt`, async () => {
    const food = seedFood();
    for (let index = 1; index <= MAX_PENDING_EDITS; index += 1) {
      const result = await editSubmission(OWNER, FOOD_ID, lightEdit(`Tên ${index}`), NOW);
      expect(result.error).toBeNull();
      expect(food.editCount).toBe(index);
    }
    expect((await editSubmission(OWNER, FOOD_ID, lightEdit("Lần nữa"), NOW)).error).toBe("EDIT_LIMIT");
    expect(food.name).toBe(`Tên ${MAX_PENDING_EDITS}`);
  });

  it("PENDING: sửa được quán mới do mình tạo, không sửa được quán có sẵn", async () => {
    seedFood();
    const restaurant = seedRestaurant();
    expect((await editSubmission(OWNER, FOOD_ID, restaurantEdit, NOW)).error).toBeNull();
    expect(restaurant.address).toBe("12 Mậu Thân");

    restaurant.moderationStatus = "approved";
    expect((await editSubmission(OWNER, FOOD_ID, restaurantEdit, NOW)).error).toBe("RESTAURANT_LOCKED");
  });

  it("PENDING: đổi từ quán mới sang quán có sẵn → +1 lượt sửa, quán mới bị rút (không còn món nào dùng)", async () => {
    const food = seedFood();
    const ownNew = seedRestaurant();
    seedRestaurant({ _id: "a00000000000000000000aa2", name: "Quán có sẵn", createdBy: "someone", moderationStatus: "approved", visibility: "visible" });

    // Quán không tồn tại → lỗi, không tốn lượt sửa.
    expect((await editSubmission(OWNER, FOOD_ID, { restaurantSwitch: { restaurantId: "a00000000000000000000aa9" } }, NOW)).error).toBe(
      "INVALID_RESTAURANT",
    );
    expect(food.editCount).toBe(0);

    expect((await editSubmission(OWNER, FOOD_ID, { restaurantSwitch: { restaurantId: "a00000000000000000000aa2" } }, NOW)).error).toBeNull();
    expect(food.restaurantId).toBe("a00000000000000000000aa2");
    expect(food.editCount).toBe(1);
    expect(ownNew.moderationStatus).toBe("withdrawn");
  });

  it("PENDING: đổi quán nhưng quán mới cũ vẫn còn món khác dùng → giữ nguyên quán đó", async () => {
    seedFood();
    seedFood({ _id: "a00000000000000000000002", moderationStatus: "pending" });
    const ownNew = seedRestaurant();
    seedRestaurant({ _id: "a00000000000000000000aa2", name: "Quán có sẵn", createdBy: "someone", moderationStatus: "approved", visibility: "visible" });
    expect((await editSubmission(OWNER, FOOD_ID, { restaurantSwitch: { restaurantId: "a00000000000000000000aa2" } }, NOW)).error).toBeNull();
    expect(ownNew.moderationStatus).toBe("pending");
  });

  it("chỉ đổi sang quán đã duyệt, đang hiển thị, chưa đóng cửa", async () => {
    seedFood();
    seedRestaurant();
    seedRestaurant({ _id: "a00000000000000000000aa3", createdBy: "someone", moderationStatus: "pending", visibility: "visible" });
    seedRestaurant({ _id: "a00000000000000000000aa4", createdBy: "someone", moderationStatus: "approved", visibility: "visible", businessStatus: "closed" });
    for (const id of ["a00000000000000000000aa3", "a00000000000000000000aa4"]) {
      expect((await editSubmission(OWNER, FOOD_ID, { restaurantSwitch: { restaurantId: id } }, NOW)).error).toBe("INVALID_RESTAURANT");
    }
  });

  it("IN_REVIEW / NEEDS_CHANGES: không đổi được quán", async () => {
    const food = seedFood({ moderationStatus: "needs_revision" });
    seedRestaurant({ _id: "a00000000000000000000aa2", createdBy: "someone", moderationStatus: "approved", visibility: "visible" });
    const switchInput: SubmissionEditInput = { restaurantSwitch: { restaurantId: "a00000000000000000000aa2" } };
    expect((await editSubmission(OWNER, FOOD_ID, switchInput, NOW)).error).toBe("FIELDS_BLOCKED");
    Object.assign(food, { moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    expect((await editSubmission(OWNER, FOOD_ID, switchInput, NOW)).error).toBe("FIELDS_BLOCKED");
    expect(food.restaurantId).toBe("rest-1");
  });

  it("hết lượt sửa thì đổi quán cũng bị chặn", async () => {
    seedFood({ editCount: MAX_PENDING_EDITS });
    seedRestaurant({ _id: "a00000000000000000000aa2", createdBy: "someone", moderationStatus: "approved", visibility: "visible" });
    expect((await editSubmission(OWNER, FOOD_ID, { restaurantSwitch: { restaurantId: "a00000000000000000000aa2" } }, NOW)).error).toBe("EDIT_LIMIT");
  });

  it("PENDING: sửa giờ mở cửa quán mới — chặn giờ sai, lưu lịch + chuỗi tóm tắt, 'Không rõ giờ' bỏ chuỗi", async () => {
    const food = seedFood();
    const restaurant = seedRestaurant({ openingHours: "06:00 - 21:00" });
    const withHours = (openingSchedule: unknown): SubmissionEditInput => ({
      restaurant: { ...restaurantEdit.restaurant!, openingSchedule },
    });

    const invalid = { status: "known", mode: "daily", days: [] };
    expect((await editSubmission(OWNER, FOOD_ID, withHours(invalid), NOW)).error).toBe("INVALID_OPENING_HOURS");
    expect(food.editCount).toBe(0);

    const night = {
      status: "known",
      mode: "daily",
      days: Array.from({ length: 7 }, (_, day) => ({ day, closed: false, allDay: false, ranges: [{ open: "18:00", close: "02:00" }] })),
    };
    expect((await editSubmission(OWNER, FOOD_ID, withHours(night), NOW)).error).toBeNull();
    expect(restaurant.openingSchedule).toEqual(night);
    expect(restaurant.openingHours).toBe("Hằng ngày 18:00–02:00");

    expect((await editSubmission(OWNER, FOOD_ID, withHours({ status: "unknown" }), NOW)).error).toBeNull();
    expect(restaurant.openingSchedule).toEqual({ status: "unknown" });
    expect(restaurant.openingHours).toBeUndefined();
  });

  it("reviewer nhận xác minh đúng lúc user đang lưu → bản sửa không lọt", async () => {
    const food = seedFood();
    // Giữa lúc đọc và lúc ghi, reviewer nhận đề xuất.
    h.hooks.beforeCategoryCheck = () => Object.assign(food, { moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const result = await editSubmission(OWNER, FOOD_ID, lightEdit(), NOW);
    expect(result.error).toBe("STATUS_CHANGED");
    expect(food.name).toBe("Bún mắm");
    expect(food.editCount).toBe(0);
  });

  it("chỉ chủ đề xuất được sửa", async () => {
    seedFood();
    expect((await editSubmission("someone-else", FOOD_ID, lightEdit(), NOW)).error).toBe("NOT_FOUND");
  });
});

describe("ghi chú đính chính", () => {
  it("chỉ gửi được khi đang xác minh, và báo reviewer đang giữ", async () => {
    const food = seedFood();
    expect((await addSubmissionNote(OWNER, FOOD_ID, "Giá đúng là 35k", NOW)).error).toBe("NOT_IN_REVIEW");

    Object.assign(food, { moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    const result = await addSubmissionNote(OWNER, FOOD_ID, "Giá đúng là 35k", NOW);
    expect(result.error).toBeNull();
    expect(h.notes).toHaveLength(1);
    expect(h.notifications).toContainEqual(expect.objectContaining({ recipientId: REVIEWER_A, type: "submission_note_added" }));
  });

  it("ghi chú rỗng bị từ chối", async () => {
    seedFood({ moderationStatus: "in_review", reviewerId: REVIEWER_A, claimedAt: NOW });
    expect((await addSubmissionNote(OWNER, FOOD_ID, "   ", NOW)).error).toBe("INVALID_NOTE");
  });
});

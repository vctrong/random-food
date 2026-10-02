/**
 * Luật thuần của luồng xác minh đề xuất món (docs/contribute-food.md mục 8): trạng thái,
 * chuyển trạng thái hợp lệ, quyền sửa theo nhóm field, hạn giữ đề xuất. Không I/O —
 * lib/submissionWorkflow.ts dựa vào đây để dựng điều kiện update.
 */

export const SUBMISSION_STATUSES = ["pending", "in_review", "needs_revision", "approved", "rejected", "withdrawn"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Reviewer giữ đề xuất tối đa bấy nhiêu giờ, quá hạn tự nhả về `pending`. */
export const CLAIM_TTL_HOURS = 48;
export const CLAIM_TTL_MS = CLAIM_TTL_HOURS * 60 * 60 * 1000;
/** Số lần user được sửa khi đề xuất đang `pending` (reset khi gửi lại từ `needs_revision`). */
export const MAX_PENDING_EDITS = 3;
export const SUBMISSION_NOTE_MAX_LENGTH = 1000;

/** Trạng thái còn "sống" trong luồng xác minh — dùng khi kiểm tra quán còn món nào đang dùng. */
export const ACTIVE_SUBMISSION_STATUSES: SubmissionStatus[] = ["pending", "in_review", "needs_revision"];

export type SubmissionActor = "owner" | "reviewer" | "admin" | "system";

/** Bảng chuyển trạng thái duy nhất — mọi chuyển khác đều bị chặn. */
export const SUBMISSION_TRANSITIONS: { from: SubmissionStatus; to: SubmissionStatus; actors: SubmissionActor[] }[] = [
  { from: "pending", to: "in_review", actors: ["reviewer"] },
  { from: "pending", to: "withdrawn", actors: ["owner"] },
  { from: "in_review", to: "approved", actors: ["reviewer", "admin"] },
  { from: "in_review", to: "rejected", actors: ["reviewer", "admin"] },
  { from: "in_review", to: "needs_revision", actors: ["reviewer", "admin"] },
  { from: "in_review", to: "withdrawn", actors: ["owner"] },
  { from: "in_review", to: "pending", actors: ["reviewer", "system"] },
  { from: "needs_revision", to: "pending", actors: ["owner"] },
  { from: "needs_revision", to: "withdrawn", actors: ["owner"] },
  // Admin quyết định thẳng (không cần nhận) — cần cho BR-F03 khi reviewer duy nhất là người gửi.
  { from: "pending", to: "approved", actors: ["admin"] },
  { from: "pending", to: "rejected", actors: ["admin"] },
  { from: "pending", to: "needs_revision", actors: ["admin"] },
];

export function canTransition(from: string, to: SubmissionStatus, actor: SubmissionActor): boolean {
  return SUBMISSION_TRANSITIONS.some((rule) => rule.from === from && rule.to === to && rule.actors.includes(actor));
}

/** Các trạng thái mà `actor` được phép chuyển sang `to` — dùng làm điều kiện `$in` khi update. */
export function sourceStatuses(to: SubmissionStatus, actor: SubmissionActor): SubmissionStatus[] {
  return SUBMISSION_TRANSITIONS.filter((rule) => rule.to === to && rule.actors.includes(actor)).map((rule) => rule.from);
}

/** Nhóm nhẹ: thông tin món. Nhóm nặng: quán (đổi quán, hoặc tên / địa chỉ / vị trí quán mới) — đổi là phải đi xác minh chỗ khác. */
export const LIGHT_FIELDS = ["name", "description", "price", "images", "categories", "eatingLevels"] as const;
export const HEAVY_FIELDS = ["restaurant"] as const;
export type SubmissionField = (typeof LIGHT_FIELDS)[number] | (typeof HEAVY_FIELDS)[number];

export const SUBMISSION_FIELD_LABELS: Record<SubmissionField, string> = {
  name: "tên món",
  description: "mô tả",
  price: "giá",
  images: "ảnh món",
  categories: "danh mục",
  eatingLevels: "mức độ ăn",
  restaurant: "quán / địa chỉ / vị trí",
};

export interface EditPermission {
  light: boolean;
  heavy: boolean;
}

/** Nhóm nặng chỉ sửa được khi `pending`; `in_review` / `needs_revision` khoá — muốn đổi quán thì rút & tạo mới. */
export function getEditPermission(status: string): EditPermission {
  if (status === "pending") return { light: true, heavy: true };
  if (status === "needs_revision") return { light: true, heavy: false };
  return { light: false, heavy: false };
}

export function findBlockedFields(status: string, fields: SubmissionField[]): SubmissionField[] {
  const permission = getEditPermission(status);
  return fields.filter((field) =>
    (HEAVY_FIELDS as readonly string[]).includes(field) ? !permission.heavy : !permission.light,
  );
}

/** Số lượt sửa còn lại; null = không giới hạn ở trạng thái này (needs_revision) hoặc không sửa được. */
export function remainingEdits(status: string, editCount: number): number | null {
  if (status !== "pending") return null;
  return Math.max(0, MAX_PENDING_EDITS - editCount);
}

export function claimExpiresAt(claimedAt: Date | string): Date {
  return new Date(new Date(claimedAt).getTime() + CLAIM_TTL_MS);
}

export function isClaimExpired(claimedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!claimedAt) return true;
  return claimExpiresAt(claimedAt).getTime() <= now.getTime();
}

/** Mốc thời gian: đề xuất nhận trước mốc này là đã quá hạn. */
export function claimCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - CLAIM_TTL_MS);
}

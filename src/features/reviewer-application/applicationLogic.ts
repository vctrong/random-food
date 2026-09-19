import { COMMITMENTS, REVIEWER_APPLICATION_LIMITS as LIMITS } from "@/constants/reviewerApplication";
import type {
  ReviewerApplicationAccess,
  ReviewerApplicationFieldKey,
  ReviewerApplicationFields,
  ReviewerApplicationStatus,
} from "@/types/reviewerApplication";

/**
 * Logic thuần cho đơn ứng tuyển FoodReviewer — dùng chung ở client (form, tiến
 * độ) và server (validate lần cuối), nên không import gì phụ thuộc môi trường.
 */

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface AccessInput {
  role: string;
  latest: { status: ReviewerApplicationStatus; reviewedAt: string | null } | null;
  now?: Date;
}

/**
 * BR-03 + quy tắc bổ sung đã chốt: chỉ role `user` được nộp; mỗi người 1 đơn
 * chờ duyệt; bị từ chối phải chờ `reapplyCooldownDays` ngày; rút đơn thì nộp lại được ngay.
 */
export function computeApplicationAccess({ role, latest, now = new Date() }: AccessInput): ReviewerApplicationAccess {
  if (role === "foodreviewer" || role === "admin") return { state: "already_reviewer" };
  if (latest?.status === "pending") return { state: "pending" };

  if (latest?.status === "rejected" && latest.reviewedAt) {
    const until = new Date(new Date(latest.reviewedAt).getTime() + LIMITS.reapplyCooldownDays * DAY_MS);
    if (until.getTime() > now.getTime()) return { state: "cooldown", until: until.toISOString() };
  }
  return { state: "eligible" };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Trả về thông báo lỗi theo từng field; object rỗng nghĩa là hợp lệ. */
export function validateApplicationFields(fields: ReviewerApplicationFields): Partial<Record<ReviewerApplicationFieldKey, string>> {
  const errors: Partial<Record<ReviewerApplicationFieldKey, string>> = {};

  const fullName = fields.fullName.trim();
  if (!fullName || fullName.length > LIMITS.fullNameMax) errors.fullName = "Nhập họ tên thật của bạn.";

  const motivation = fields.motivation.trim();
  if (motivation.length < LIMITS.motivationMin || motivation.length > LIMITS.motivationMax) {
    errors.motivation = `Lý do ứng tuyển cần từ ${LIMITS.motivationMin} đến ${LIMITS.motivationMax} ký tự.`;
  }

  const expertiseCount = new Set(fields.expertiseCategoryIds).size;
  if (expertiseCount < LIMITS.expertiseMin || expertiseCount > LIMITS.expertiseMax) {
    errors.expertiseCategoryIds = `Chọn từ ${LIMITS.expertiseMin} đến ${LIMITS.expertiseMax} khẩu vị sở trường.`;
  }

  const areas = fields.activeAreas.map((area) => area.trim()).filter(Boolean);
  if (areas.length === 0 || areas.length > LIMITS.areasMax || areas.some((area) => area.length > LIMITS.areaMaxLength)) {
    errors.activeAreas = `Nhập từ 1 đến ${LIMITS.areasMax} khu vực bạn có thể xác minh thực địa.`;
  }

  if (fields.socialLinks.some((link) => !isHttpUrl(link.url))) {
    errors.socialLinks = "Liên kết kênh phải bắt đầu bằng http:// hoặc https://.";
  }

  if (fields.portfolioCount < LIMITS.portfolioMin || fields.portfolioCount > LIMITS.portfolioMax) {
    errors.portfolio = `Đính kèm từ ${LIMITS.portfolioMin} đến ${LIMITS.portfolioMax} ảnh tiêu biểu.`;
  }

  const words = countWords(fields.scenarioAnswer);
  if (words < LIMITS.scenarioMinWords || words > LIMITS.scenarioMaxWords) {
    errors.scenarioAnswer = `Bài trả lời cần từ ${LIMITS.scenarioMinWords} đến ${LIMITS.scenarioMaxWords} từ (hiện ${words} từ).`;
  }

  const accepted = new Set(fields.acceptedCommitmentIds);
  if (!COMMITMENTS.every((commitment) => accepted.has(commitment.id))) {
    errors.commitments = "Bạn cần đồng ý tất cả cam kết đạo đức.";
  }

  return errors;
}

export type ApplicationSectionId = "profile" | "channels" | "scenario" | "commitments";

/** Tiến độ 4 phần của form — phần "Kênh & portfolio" chỉ tính là xong khi đủ ảnh và link (nếu có) hợp lệ. */
export function getApplicationProgress(fields: ReviewerApplicationFields): Record<ApplicationSectionId, boolean> {
  const errors = validateApplicationFields(fields);
  return {
    profile: !errors.fullName && !errors.motivation && !errors.expertiseCategoryIds && !errors.activeAreas,
    channels: !errors.portfolio && !errors.socialLinks,
    scenario: !errors.scenarioAnswer,
    commitments: !errors.commitments,
  };
}

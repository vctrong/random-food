import {
  ONBOARDING_ALLOWED_PATHS,
  ONBOARDING_FOOD_DETAIL_PREFIX,
  ONBOARDING_FOOD_STATIC_SUBPATHS,
  ONBOARDING_SNOOZE_DURATION_MS,
} from "@/constants/onboarding";

/** Trang có được hiện modal hướng dẫn không (danh sách cho phép — xem constants/onboarding.ts). */
export function isOnboardingAllowedPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (ONBOARDING_ALLOWED_PATHS.has(path)) return true;
  if (!path.startsWith(ONBOARDING_FOOD_DETAIL_PREFIX)) return false;
  const segments = path.slice(ONBOARDING_FOOD_DETAIL_PREFIX.length).split("/");
  return segments.length === 1 && segments[0].length > 0 && !ONBOARDING_FOOD_STATIC_SUBPATHS.has(segments[0]);
}

/**
 * `rawSnoozedAt` là chuỗi đọc thẳng từ localStorage. Giá trị hỏng hoặc nằm ở
 * tương lai (đồng hồ máy bị chỉnh lùi) coi như không snooze — thà hiện lại
 * hướng dẫn còn hơn ẩn vô thời hạn.
 */
export function isSnoozeActive(rawSnoozedAt: string | null, now: number): boolean {
  if (!rawSnoozedAt) return false;
  const snoozedAt = Number(rawSnoozedAt);
  if (!Number.isFinite(snoozedAt)) return false;
  const elapsed = now - snoozedAt;
  return elapsed >= 0 && elapsed < ONBOARDING_SNOOZE_DURATION_MS;
}

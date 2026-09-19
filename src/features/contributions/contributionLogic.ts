import {
  ACHIEVEMENTS,
  ACHIEVEMENT_THRESHOLDS,
  CONTRIBUTOR_LEVELS,
  type AchievementId,
  type ContributorLevel,
} from "@/constants/contribution";
import type {
  Contribution,
  ContributionDisplayStatus,
  ContributionSort,
  ContributionStatus,
  ContributionSummary,
  ContributionTab,
} from "@/types/contribution";

/**
 * Trạng thái gộp của 1 đóng góp = món + quán do chính user tạo kèm theo (BR-C07).
 * Ưu tiên tình trạng "cần user hành động" trước, để không bị che bởi phần đã duyệt.
 */
export function deriveContributionStatus(
  foodStatus: ContributionStatus,
  foodVisibility: string,
  ownedRestaurantStatus: ContributionStatus | null,
): ContributionDisplayStatus {
  const statuses = ownedRestaurantStatus ? [foodStatus, ownedRestaurantStatus] : [foodStatus];
  if (statuses.includes("needs_revision")) return "needs_revision";
  if (statuses.includes("rejected")) return "rejected";
  if (statuses.includes("pending")) return "pending";
  return foodVisibility === "hidden" ? "hidden" : "approved";
}

export function summarizeContributions(contributions: Contribution[]): ContributionSummary {
  const count = (status: ContributionDisplayStatus) => contributions.filter((item) => item.status === status).length;
  return {
    total: contributions.length,
    approved: count("approved"),
    pending: count("pending"),
    needsRevision: count("needs_revision"),
    rejected: count("rejected"),
  };
}

export function filterContributions(contributions: Contribution[], tab: ContributionTab, search: string): Contribution[] {
  const query = search.trim().toLowerCase();
  return contributions.filter((item) => {
    if (tab !== "all" && item.status !== tab) return false;
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      (item.restaurant?.name.toLowerCase().includes(query) ?? false) ||
      (item.restaurant?.address.toLowerCase().includes(query) ?? false)
    );
  });
}

export function sortContributions(contributions: Contribution[], sort: ContributionSort): Contribution[] {
  const byCreatedAt = (a: Contribution, b: Contribution) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const sorted = [...contributions];
  switch (sort) {
    case "oldest":
      return sorted.sort(byCreatedAt);
    case "most_saved":
      return sorted.sort((a, b) => b.saveCount - a.saveCount || byCreatedAt(b, a));
    case "top_rated":
      return sorted.sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount || byCreatedAt(b, a));
    default:
      return sorted.sort((a, b) => byCreatedAt(b, a));
  }
}

export interface ContributorLevelProgress {
  current: ContributorLevel;
  next: ContributorLevel | null;
  approvedCount: number;
  /** Số món duyệt còn thiếu để lên cấp kế tiếp (0 nếu đã cấp cao nhất). */
  remaining: number;
  /** 0–100, tiến độ trong khoảng từ ngưỡng cấp hiện tại tới ngưỡng cấp kế tiếp. */
  percent: number;
}

export function getContributorLevel(approvedCount: number): ContributorLevelProgress {
  let current = CONTRIBUTOR_LEVELS[0];
  for (const level of CONTRIBUTOR_LEVELS) {
    if (approvedCount >= level.minApproved) current = level;
  }
  const next = CONTRIBUTOR_LEVELS.find((level) => level.level === current.level + 1) ?? null;
  if (!next) return { current, next: null, approvedCount, remaining: 0, percent: 100 };

  const span = next.minApproved - current.minApproved;
  const done = approvedCount - current.minApproved;
  return {
    current,
    next,
    approvedCount,
    remaining: next.minApproved - approvedCount,
    percent: Math.min(100, Math.max(0, Math.round((done / span) * 100))),
  };
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
}

export function getAchievementProgress(contributions: Contribution[]): AchievementProgress[] {
  const approved = contributions.filter((item) => item.status === "approved");
  const categoryIds = new Set(approved.flatMap((item) => item.categories.map((category) => category.id)));
  const totalSaves = approved.reduce((sum, item) => sum + item.saveCount, 0);
  const hasApprovedOwnRestaurant = approved.some(
    (item) => item.restaurant?.isOwnedByUser && item.restaurant.status === "approved",
  );

  const unlocked: Record<AchievementId, boolean> = {
    first_approved: approved.length >= 1,
    new_restaurant: hasApprovedOwnRestaurant,
    many_categories: categoryIds.size >= ACHIEVEMENT_THRESHOLDS.manyCategories,
    loved_by_many: totalSaves >= ACHIEVEMENT_THRESHOLDS.lovedBySaves,
    steady_contributor: contributions.length >= ACHIEVEMENT_THRESHOLDS.steadySubmissions,
  };

  return ACHIEVEMENTS.map((achievement) => ({ id: achievement.id, unlocked: unlocked[achievement.id] }));
}

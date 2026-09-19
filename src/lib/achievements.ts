import { connectDB } from "@/lib/mongodb";
import { UserAchievement } from "@/lib/models/UserAchievement";
import { ACHIEVEMENTS } from "@/constants/contribution";
import { getAchievementProgress } from "@/features/contributions/contributionLogic";
import { listContributionsForUser } from "@/lib/contributions";
import type { AchievementStatus, Contribution } from "@/types/contribution";

/**
 * Đồng bộ thành tựu của user: tính điều kiện hiện tại, rồi ghi những thành
 * tựu mới đạt (idempotent — upsert theo (userId, achievementId), gọi lại nhiều
 * lần không tạo trùng). Thành tựu đã mở khoá được GIỮ dù sau đó điều kiện không
 * còn đúng (vd món bị ẩn) — khác với cấp độ, luôn tính động từ số món đang duyệt.
 */
export async function syncAchievements(userId: string, contributions: Contribution[]): Promise<AchievementStatus[]> {
  await connectDB();

  const stored = (await UserAchievement.find({ userId }).lean()) as unknown as { achievementId: string; unlockedAt: Date }[];
  const unlockedAtById = new Map<string, Date>(stored.map((item) => [item.achievementId, item.unlockedAt]));

  const now = new Date();
  const newlyUnlocked = getAchievementProgress(contributions).filter((item) => item.unlocked && !unlockedAtById.has(item.id));

  if (newlyUnlocked.length > 0) {
    await UserAchievement.bulkWrite(
      newlyUnlocked.map((item) => ({
        updateOne: {
          filter: { userId, achievementId: item.id },
          update: { $setOnInsert: { unlockedAt: now } },
          upsert: true,
        },
      })),
    );
    for (const item of newlyUnlocked) unlockedAtById.set(item.id, now);
  }

  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    unlockedAt: unlockedAtById.get(achievement.id)?.toISOString() ?? null,
  }));
}

/** Tải đóng góp + đồng bộ thành tựu trong 1 lượt — dùng chung cho trang SSR và API. */
export async function getContributionOverview(userId: string) {
  const contributions = await listContributionsForUser(userId);
  const achievements = await syncAchievements(userId, contributions);
  return { contributions, achievements };
}

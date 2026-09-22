import { Lock } from "lucide-react";
import { ACHIEVEMENTS } from "@/constants/contribution";
import { cn, formatDate } from "@/lib/utils";
import type { ContributorLevelProgress } from "@/features/contributions/contributionLogic";
import type { AchievementStatus } from "@/types/contribution";

interface ContributorLevelCardProps {
  levelProgress: ContributorLevelProgress;
  achievements: AchievementStatus[];
}

/** Cấp độ (tính động từ số món `approved`) + thành tựu (đã lưu DB, giữ ngày mở khoá). */
export function ContributorLevelCard({ levelProgress, achievements }: ContributorLevelCardProps) {
  const { current, next, approvedCount, remaining, percent } = levelProgress;
  const LevelIcon = current.icon;
  const unlockedCount = achievements.filter((item) => item.unlockedAt !== null).length;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-primary-blue text-white flex items-center justify-center shadow-sm shrink-0">
          <LevelIcon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-blue">Cấp {current.level} · Đóng góp</span>
          <h3 className="text-lg font-subheading font-semibold text-text-primary leading-tight">{current.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{current.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-text-primary">{next ? `Tiến độ lên “${next.title}”` : "Bạn đã đạt cấp cao nhất"}</span>
          <span className="text-primary-blue">
            {approvedCount}
            {next ? ` / ${next.minApproved}` : ""} món được duyệt
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full h-2.5 rounded-full bg-soft-blue overflow-hidden"
        >
          <div className="h-full rounded-full bg-primary-blue transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        {next && (
          <p className="text-xs text-text-secondary">
            Cần thêm {remaining} món được duyệt để lên cấp {next.level}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Thành tựu</span>
          <span className="text-xs font-semibold text-text-secondary">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {ACHIEVEMENTS.map((achievement) => {
            const unlockedAt = achievements.find((item) => item.id === achievement.id)?.unlockedAt ?? null;
            const unlocked = unlockedAt !== null;
            const Icon = achievement.icon;
            return (
              <li
                key={achievement.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border transition-colors",
                  unlocked ? "bg-soft-pink border-primary-pink/20" : "bg-cream border-transparent",
                )}
              >
                <span
                  className={cn(
                    "size-9 rounded-full flex items-center justify-center shrink-0",
                    unlocked ? "bg-primary-pink text-white" : "bg-border text-text-secondary",
                  )}
                >
                  {unlocked ? <Icon className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", unlocked ? "text-text-primary" : "text-text-secondary")}>{achievement.title}</p>
                  <p className="text-xs text-text-secondary">
                    {unlockedAt ? `Đạt ngày ${formatDate(unlockedAt)}` : achievement.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

import { Badge, Flag, ShieldCheck, Tags, UserX, Users, UtensilsCrossed } from "lucide-react";
import { getOverviewStats, getRecentActivity } from "@/lib/admin/overview";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AUDIT_ACTION_LABELS, AUDIT_TARGET_LABELS } from "@/constants/admin";
import { formatRelativeTime } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [stats, activity] = await Promise.all([getOverviewStats(), getRecentActivity(10)]);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-ink">Trung tâm giám sát</p>
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Tổng quan hệ thống
        </h1>
        <p className="text-sm text-text-secondary">
          Số liệu thật, truy vấn trực tiếp từ cơ sở dữ liệu — không có chỉ số mô phỏng.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Tổng thành viên" value={stats.totalUsers} />
        <StatCard icon={UserX} label="Tài khoản bị khoá" value={stats.bannedUsers} tone="pink" />
        <StatCard icon={UtensilsCrossed} label="Món/quán chờ duyệt" value={stats.pendingFoods + stats.pendingRestaurants} />
        <StatCard icon={Flag} label="Báo cáo chờ xử lý" value={stats.pendingReports} tone="pink" />
        <StatCard icon={Badge} label="Đơn ứng tuyển Reviewer chờ duyệt" value={stats.pendingReviewerApplications} />
        <StatCard icon={Tags} label="Đề xuất danh mục chờ duyệt" value={stats.pendingCategoryProposals} />
        <StatCard icon={ShieldCheck} label="Hoạt động quản trị (7 ngày)" value={stats.auditLogLast7Days} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-heading font-semibold text-text-primary mb-4">Hoạt động gần đây</h2>
        {activity.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Chưa có hoạt động nào"
            description="Mọi hành động duyệt/khoá/xử lý của Admin sẽ hiện ở đây."
          />
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((entry) => (
              <li key={entry.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-semibold">{entry.actorName}</span>{" "}
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    {entry.targetName && (
                      <>
                        {" "}
                        — <span className="font-medium">{entry.targetName}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {AUDIT_TARGET_LABELS[entry.targetType] ?? entry.targetType}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </div>
                <span className="text-xs text-text-secondary whitespace-nowrap">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

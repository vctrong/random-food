import { CheckCircle2, Clock, EyeOff, PenLine, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContributionDisplayStatus } from "@/types/contribution";

export const CONTRIBUTION_STATUS_CONFIG: Record<
  ContributionDisplayStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  approved: { label: "Đã duyệt & lên thực đơn", className: "bg-success/15 text-success", icon: CheckCircle2 },
  pending: { label: "Đang kiểm duyệt", className: "bg-soft-blue text-primary-blue", icon: Clock },
  needs_revision: { label: "Cần chỉnh sửa", className: "bg-warning/20 text-[#8a690b]", icon: PenLine },
  rejected: { label: "Bị từ chối", className: "bg-primary-pink/15 text-primary-pink", icon: XCircle },
  hidden: { label: "Đang bị ẩn", className: "bg-border text-text-secondary", icon: EyeOff },
};

export function ContributionStatusBadge({ status, className }: { status: ContributionDisplayStatus; className?: string }) {
  const { label, className: tone, icon: Icon } = CONTRIBUTION_STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", tone, className)}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

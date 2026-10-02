import { CheckCircle2, Clock, EyeOff, PenLine, ScanSearch, Undo2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContributionDisplayStatus } from "@/types/contribution";

export const CONTRIBUTION_STATUS_CONFIG: Record<
  ContributionDisplayStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  pending: { label: "Chờ xác minh", className: "bg-primary-soft text-primary", icon: Clock },
  in_review: { label: "Đang xác minh", className: "bg-secondary-soft text-secondary-strong dark:text-text-primary", icon: ScanSearch },
  needs_revision: { label: "Cần chỉnh sửa", className: "bg-warning/20 text-[#8a690b]", icon: PenLine },
  approved: { label: "Đã duyệt", className: "bg-success/15 text-success", icon: CheckCircle2 },
  rejected: { label: "Bị từ chối", className: "bg-accent/15 text-accent-ink", icon: XCircle },
  withdrawn: { label: "Đã rút", className: "bg-border text-text-secondary", icon: Undo2 },
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

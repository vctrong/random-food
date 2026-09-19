import { CheckCircle2, PenLine, XCircle } from "lucide-react";
import type { ModerationDecision } from "@/types/reviewer";

const CONFIG: Record<ModerationDecision, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Đã duyệt", className: "bg-success/15 text-success", icon: CheckCircle2 },
  needs_revision: { label: "Cần sửa", className: "bg-warning/20 text-[#8a690b]", icon: PenLine },
  rejected: { label: "Từ chối", className: "bg-primary-pink/15 text-primary-pink", icon: XCircle },
};

export function DecisionBadge({ decision }: { decision: ModerationDecision }) {
  const { label, className, icon: Icon } = CONFIG[decision];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

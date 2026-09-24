import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-10 rounded-2xl bg-surface shadow-sm text-center space-y-3">
      <div className="w-14 h-14 mx-auto rounded-full bg-primary-soft flex items-center justify-center text-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

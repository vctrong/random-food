import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "blue" | "pink";
}

export function StatCard({ icon: Icon, label, value, tone = "blue" }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div
        className={
          tone === "blue"
            ? "w-12 h-12 rounded-2xl bg-soft-blue flex items-center justify-center text-primary-blue shrink-0"
            : "w-12 h-12 rounded-2xl bg-soft-pink flex items-center justify-center text-primary-pink shrink-0"
        }
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary leading-snug">{label}</p>
        <p className="text-2xl font-heading font-semibold text-text-primary tracking-tight">
          {new Intl.NumberFormat("vi-VN").format(value)}
        </p>
      </div>
    </Card>
  );
}

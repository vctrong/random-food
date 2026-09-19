"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, FileClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AUDIT_ACTION_LABELS, AUDIT_TARGET_LABELS } from "@/constants/admin";
import { formatDateTime } from "@/lib/utils";
import type { AdminAuditLogRow } from "@/types/admin";

interface AuditLogContentProps {
  initialEntries: AdminAuditLogRow[];
  initialTotal: number;
}

const PAGE_SIZE = 20;

export function AuditLogContent({ initialEntries, initialTotal }: AuditLogContentProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [isLoading, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    // Bỏ qua lần render đầu — đã có SSR data từ page.tsx.
    if (page === 1 && !actionFilter && !targetFilter) return;

    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set("action", actionFilter);
    if (targetFilter) params.set("targetType", targetFilter);

    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        startTransition(() => {
          setEntries(data.entries);
          setTotal(data.total);
        });
      });

    return () => {
      cancelled = true;
    };
  }, [page, actionFilter, targetFilter]);

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Nhật ký kiểm toán hệ thống
        </h1>
        <p className="text-sm text-text-secondary">
          {total} sự kiện — mọi thao tác duyệt/khoá/xử lý của Admin &amp; FoodReviewer được ghi lại tại đây.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
            className="h-11 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
          >
            <option value="">Tất cả hành động</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={targetFilter}
            onChange={(e) => handleFilterChange(setTargetFilter, e.target.value)}
            className="h-11 px-3 rounded-xl bg-cream text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
          >
            <option value="">Tất cả đối tượng</option>
            {Object.entries(AUDIT_TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {entries.length === 0 && !isLoading ? (
        <EmptyState icon={FileClock} title="Chưa có sự kiện nào" description="Thử đổi bộ lọc." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                  <th className="px-4 py-3 font-semibold">Hành động</th>
                  <th className="px-4 py-3 font-semibold">Đối tượng</th>
                  <th className="px-4 py-3 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-border ${isLoading ? "opacity-50" : ""}`}>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-3 text-text-primary font-medium">{entry.actor?.name ?? "Hệ thống"}</td>
                    <td className="px-4 py-3 text-text-primary">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-3 text-text-secondary">{AUDIT_TARGET_LABELS[entry.targetType] ?? entry.targetType}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{entry.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-secondary">
              Trang {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-cream disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-cream disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

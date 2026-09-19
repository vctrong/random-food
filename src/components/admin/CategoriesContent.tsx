"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Tags, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRelativeTime } from "@/lib/utils";
import type { AdminCategoryProposalRow, AdminCategoryRow } from "@/types/admin";

interface CategoriesContentProps {
  initialCategories: AdminCategoryRow[];
  initialProposals: AdminCategoryProposalRow[];
}

export function CategoriesContent({ initialCategories, initialProposals }: CategoriesContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [proposals, setProposals] = useState(initialProposals);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      showToast("Đã tạo danh mục mới.", "success");
      setNewName("");
      router.refresh();
      const listRes = await fetch("/api/admin/categories");
      if (listRes.ok) setCategories(await listRes.json());
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(category: AdminCategoryRow) {
    const isActive = !category.isActive;
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: category.id, isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Có lỗi xảy ra.", "error");
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isActive } : c)));
    router.refresh();
  }

  async function handleProposalDecision(proposalId: string, decision: "approved" | "rejected") {
    setDecidingId(proposalId);
    try {
      const res = await fetch("/api/admin/category-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: decision } : p)));
      showToast(decision === "approved" ? "Đã duyệt đề xuất và tạo danh mục mới." : "Đã từ chối đề xuất.", "success");
      router.refresh();
      if (decision === "approved") {
        const listRes = await fetch("/api/admin/categories");
        if (listRes.ok) setCategories(await listRes.json());
      }
    } finally {
      setDecidingId(null);
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">
          Danh mục hệ thống
        </h1>
        <p className="text-sm text-text-secondary">{categories.length} danh mục · {pendingProposals.length} đề xuất chờ duyệt</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-text-primary">Danh mục chính thức</h2>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên danh mục mới..."
              className="h-10 px-3 rounded-xl bg-cream text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
            />
            <Button size="sm" leftIcon={<Plus className="size-4" />} isLoading={isCreating} onClick={handleCreate}>
              Tạo mới
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <EmptyState icon={Tags} title="Chưa có danh mục nào" description="Tạo danh mục đầu tiên bằng ô nhập ở trên." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-cream">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{category.name}</p>
                  <p className="text-xs text-text-secondary truncate">/{category.slug}</p>
                </div>
                <Toggle checked={category.isActive} onChange={() => handleToggleActive(category)} label={`Bật/tắt ${category.name}`} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Đề xuất từ cộng đồng</h2>
        {pendingProposals.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Không có đề xuất nào đang chờ"
            description="Khi có tính năng đề xuất danh mục ở phía người dùng, đề xuất sẽ hiện tại đây."
          />
        ) : (
          <ul className="divide-y divide-border">
            {pendingProposals.map((proposal) => (
              <li key={proposal.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{proposal.name}</p>
                  <p className="text-xs text-text-secondary">
                    Đề xuất bởi {proposal.proposedBy.name} · {formatRelativeTime(proposal.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle2 className="size-4" />}
                    isLoading={decidingId === proposal.id}
                    onClick={() => handleProposalDecision(proposal.id, "approved")}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<XCircle className="size-4" />}
                    isLoading={decidingId === proposal.id}
                    onClick={() => handleProposalDecision(proposal.id, "rejected")}
                  >
                    Từ chối
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

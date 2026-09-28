"use client";

import { useMemo, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, GitMerge, Plus, Sparkles, Tags, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { SearchListbox } from "@/components/ui/SearchListbox";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatRelativeTime } from "@/lib/utils";
import { fuzzyScore } from "@/lib/vietnameseText";
import { CATEGORY_GROUPS, CATEGORY_GROUP_LABELS, type CategoryGroup } from "@/constants/categoryGroups";
import type { AdminCategoryProposalRow, AdminCategoryRow } from "@/types/admin";

interface CategoriesContentProps {
  initialCategories: AdminCategoryRow[];
  initialProposals: AdminCategoryProposalRow[];
}

const GROUP_OPTIONS: SelectMenuOption<CategoryGroup>[] = CATEGORY_GROUPS.map((group) => ({ value: group.id, label: group.label }));
/** Danh mục mới không được xếp vào nhóm "Khác" (chỉ dành cho danh mục hệ thống). */
const NEW_CATEGORY_GROUP_OPTIONS = GROUP_OPTIONS.filter((option) => option.value !== "khac");

const PROPOSAL_STATUS: Record<AdminCategoryProposalRow["status"], { label: string; variant: "blue" | "success" | "neutral" | "warning" }> = {
  pending: { label: "Chờ xử lý", variant: "warning" },
  approved: { label: "Đã tạo danh mục", variant: "success" },
  merged: { label: "Đã gộp", variant: "blue" },
  rejected: { label: "Đã từ chối", variant: "neutral" },
};

async function postJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as { error?: string; affectedFoods?: number };
  return { ok: response.ok, data };
}

export function CategoriesContent({ initialCategories, initialProposals }: CategoriesContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [proposals, setProposals] = useState(initialProposals);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<CategoryGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function reloadCategories() {
    const listRes = await fetch("/api/admin/categories");
    if (listRes.ok) setCategories(await listRes.json());
  }

  async function handleCreate() {
    if (!newName.trim() || !newGroup) return;
    setIsCreating(true);
    try {
      const { ok, data } = await postJson("/api/admin/categories", "POST", { name: newName, group: newGroup });
      if (!ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      showToast("Đã tạo danh mục mới.", "success");
      setNewName("");
      setNewGroup(null);
      await reloadCategories();
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  }

  async function updateCategory(category: AdminCategoryRow, changes: Partial<Pick<AdminCategoryRow, "isActive" | "group">>) {
    const { ok, data } = await postJson("/api/admin/categories", "PATCH", { categoryId: category.id, ...changes });
    if (!ok) {
      showToast(data.error ?? "Có lỗi xảy ra.", "error");
      return;
    }
    setCategories((prev) => prev.map((item) => (item.id === category.id ? { ...item, ...changes } : item)));
    router.refresh();
  }

  async function handleResolved(proposalId: string, status: AdminCategoryProposalRow["status"]) {
    setProposals((prev) => prev.map((proposal) => (proposal.id === proposalId ? { ...proposal, status } : proposal)));
    await reloadCategories();
    router.refresh();
  }

  const pendingProposals = proposals.filter((proposal) => proposal.status === "pending");
  const resolvedProposals = proposals.filter((proposal) => proposal.status !== "pending").slice(0, 8);
  const selectableCategories = categories.filter((category) => category.isActive && !category.isSystem);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold text-text-primary tracking-tight">Danh mục hệ thống</h1>
        <p className="text-sm text-text-secondary">
          {categories.length} danh mục · {pendingProposals.length} đề xuất chờ duyệt
        </p>
      </div>

      <Card className="p-4 sm:p-5 space-y-4">
        <h2 id="pending-proposals" className="font-heading font-semibold text-text-primary">
          Đề xuất từ cộng đồng
        </h2>
        {pendingProposals.length === 0 ? (
          <EmptyState icon={Tags} title="Không có đề xuất nào đang chờ" description="Đề xuất user gửi kèm món ăn sẽ hiện ở đây." />
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingProposals.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                categories={selectableCategories}
                onResolved={(status) => void handleResolved(proposal.id, status)}
              />
            ))}
          </ul>
        )}

        {resolvedProposals.length > 0 && (
          <details className="group rounded-xl bg-background px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-text-secondary">Đã xử lý gần đây</summary>
            <ul className="mt-2 divide-y divide-border">
              {resolvedProposals.map((proposal) => (
                <li key={proposal.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-sm text-text-primary">{proposal.name}</span>
                  <Badge variant={PROPOSAL_STATUS[proposal.status].variant}>{PROPOSAL_STATUS[proposal.status].label}</Badge>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <h2 className="font-heading font-semibold text-text-primary">Danh mục chính thức</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem_auto] gap-2 w-full lg:w-auto">
            <input
              value={newName}
              maxLength={40}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Tên danh mục mới…"
              aria-label="Tên danh mục mới"
              className="h-11 min-w-0 px-3.5 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            <SelectMenu value={newGroup} onChange={setNewGroup} options={NEW_CATEGORY_GROUP_OPTIONS} placeholder="Nhóm cha…" label="Nhóm cha" />
            <Button leftIcon={<Plus className="size-4" />} isLoading={isCreating} disabled={!newName.trim() || !newGroup} onClick={handleCreate}>
              Tạo mới
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <EmptyState icon={Tags} title="Chưa có danh mục nào" description="Tạo danh mục đầu tiên bằng ô nhập ở trên." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-2.5 p-3 rounded-xl bg-background">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                      <span className="truncate">{category.name}</span>
                      {category.isSystem && <Badge variant="neutral">Hệ thống</Badge>}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      /{category.slug} · {category.foodCount} món
                    </p>
                  </div>
                  <Toggle
                    checked={category.isActive}
                    onChange={() => (category.isSystem ? undefined : void updateCategory(category, { isActive: !category.isActive }))}
                    label={`Bật/tắt ${category.name}`}
                  />
                </div>
                <SelectMenu
                  size="sm"
                  value={category.group}
                  onChange={(group) => void updateCategory(category, { group })}
                  options={GROUP_OPTIONS}
                  placeholder="Nhóm cha"
                  label={`Nhóm cha của ${category.name}`}
                  disabled={category.isSystem}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProposalRow({
  proposal,
  categories,
  onResolved,
}: {
  proposal: AdminCategoryProposalRow;
  categories: AdminCategoryRow[];
  onResolved: (status: AdminCategoryProposalRow["status"]) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(proposal.name);
  const [group, setGroup] = useState<CategoryGroup | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeQuery, setMergeQuery] = useState("");
  const [pending, setPending] = useState<"approved" | "merged" | "rejected" | null>(null);

  const mergeOptions = useMemo(() => {
    const query = mergeQuery.trim() || proposal.name;
    return [...categories]
      .map((category) => ({ category, score: fuzzyScore(query, category.name) }))
      .filter((entry) => !mergeQuery.trim() || entry.score > 0)
      .sort((a, b) => b.score - a.score || a.category.name.localeCompare(b.category.name, "vi"))
      .map((entry) => entry.category);
  }, [categories, mergeQuery, proposal.name]);

  async function decide(decision: "approved" | "merged" | "rejected", categoryId?: string) {
    setPending(decision);
    try {
      const body =
        decision === "approved"
          ? { decision, proposalId: proposal.id, name, group }
          : decision === "merged"
            ? { decision, proposalId: proposal.id, categoryId }
            : { decision, proposalId: proposal.id };
      const { ok, data } = await postJson("/api/admin/category-proposals", "POST", body);
      if (!ok) {
        showToast(data.error ?? "Có lỗi xảy ra.", "error");
        return;
      }
      const count = data.affectedFoods ?? 0;
      showToast(
        decision === "approved"
          ? `Đã tạo danh mục “${name.trim()}” và gán cho ${count} món.`
          : decision === "merged"
            ? `Đã gộp đề xuất, cập nhật ${count} món.`
            : `Đã từ chối đề xuất (${count} món giữ danh mục khác hoặc về “Khác”).`,
        "success",
      );
      onResolved(decision);
    } finally {
      setPending(null);
    }
  }

  const visibleFoods = proposal.foods.slice(0, 4);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-text-primary">
            <Sparkles className="size-4 text-accent-ink" aria-hidden />
            <span className="truncate">{proposal.name}</span>
          </p>
          <p className="text-xs text-text-secondary">
            {proposal.proposalCount} lượt đề xuất · đầu tiên bởi {proposal.proposedBy.name} · {formatRelativeTime(proposal.createdAt)}
          </p>
        </div>
        <Badge variant="pink">Áp dụng cho {proposal.foods.length} món</Badge>
      </div>

      {visibleFoods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleFoods.map((food) => (
            <span key={food.id} className="max-w-[14rem] truncate rounded-full bg-background px-2.5 py-1 text-xs text-text-primary">
              {food.name}
              {food.status !== "approved" && <span className="text-text-secondary"> · chờ duyệt</span>}
            </span>
          ))}
          {proposal.foods.length > visibleFoods.length && (
            <span className="rounded-full bg-background px-2.5 py-1 text-xs text-text-secondary">+{proposal.foods.length - visibleFoods.length} món</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_11rem_auto] gap-2 items-start">
        <input
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          aria-label={`Tên danh mục sẽ tạo từ đề xuất ${proposal.name}`}
          className="h-11 min-w-0 px-3.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
        <SelectMenu value={group} onChange={setGroup} options={NEW_CATEGORY_GROUP_OPTIONS} placeholder="Chọn nhóm cha…" label="Nhóm cha" />
        <Button
          isLoading={pending === "approved"}
          disabled={pending !== null || name.trim().length < 2 || !group}
          onClick={() => void decide("approved")}
          leftIcon={<Plus className="size-4" aria-hidden />}
        >
          Tạo danh mục
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ResponsivePicker
          open={mergeOpen}
          onOpenChange={(open) => {
            setMergeOpen(open);
            if (!open) setMergeQuery("");
          }}
          title="Gộp vào danh mục có sẵn"
          minWidth={300}
          trigger={(props) => (
            <button
              type="button"
              ref={props.ref as Ref<HTMLButtonElement>}
              aria-expanded={props["aria-expanded"]}
              aria-haspopup={props["aria-haspopup"]}
              onClick={props.onClick}
              disabled={pending !== null}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border bg-surface text-sm font-semibold text-text-primary transition-colors disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                props["aria-expanded"] ? "border-primary" : "border-border hover:bg-primary-soft",
              )}
            >
              <GitMerge className="size-4 text-primary" aria-hidden />
              Gộp vào danh mục có sẵn
              <ChevronDown className="size-4 text-text-secondary" aria-hidden />
            </button>
          )}
        >
          <SearchListbox
            query={mergeQuery}
            onQueryChange={setMergeQuery}
            placeholder="Tìm danh mục"
            inputLabel="Tìm danh mục để gộp"
            sections={[{ id: "categories", options: mergeOptions }]}
            getOptionId={(category) => category.id}
            onSelect={(category) => {
              setMergeOpen(false);
              void decide("merged", category.id);
            }}
            renderOption={(category) => (
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="truncate text-sm font-medium text-text-primary">{category.name}</span>
                <span className="shrink-0 text-xs text-text-secondary">{CATEGORY_GROUP_LABELS[category.group]}</span>
              </div>
            )}
          />
        </ResponsivePicker>
        <Button
          size="sm"
          variant="outline"
          isLoading={pending === "rejected"}
          disabled={pending !== null}
          onClick={() => void decide("rejected")}
          leftIcon={<XCircle className="size-4 text-accent-ink" aria-hidden />}
        >
          Từ chối
        </Button>
      </div>
    </li>
  );
}

"use client";

import { useMemo, useState, type Ref } from "react";
import { ChevronDown, GitMerge, Info, Tags, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fuzzyScore } from "@/lib/vietnameseText";
import { Button } from "@/components/ui/Button";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { SearchListbox } from "@/components/ui/SearchListbox";
import { useToast } from "@/components/ui/ToastProvider";
import { CATEGORY_GROUP_LABELS } from "@/constants/categoryGroups";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import type { CategoryOption } from "@/types/category";
import type { ReviewQueueProposal } from "@/types/reviewer";

interface ProposalReviewPanelProps {
  foodId: string;
  proposal: ReviewQueueProposal;
  categories: CategoryOption[];
  disabled: boolean;
  /** Đã xử lý xong — nơi gọi cập nhật hàng chờ (mọi món dùng chung đề xuất). */
  onResolved: (result: { proposalId: string; mergedCategory: CategoryOption | null }) => void;
}

/**
 * Xử lý danh mục user đề xuất khi duyệt món. FoodReviewer CHỈ được gộp vào danh
 * mục có sẵn hoặc từ chối — không có nút tạo danh mục (chỉ Admin tạo, server cũng chặn).
 */
export function ProposalReviewPanel({ foodId, proposal, categories, disabled, onResolved }: ProposalReviewPanelProps) {
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<CategoryOption | null>(null);
  const [pending, setPending] = useState<"merge" | "reject" | null>(null);

  const options = useMemo(() => {
    const trimmed = query.trim() || proposal.name;
    return [...categories]
      .map((category) => ({ category, score: fuzzyScore(trimmed, category.name) }))
      .sort((a, b) => b.score - a.score || a.category.name.localeCompare(b.category.name, "vi"))
      .filter((entry) => !query.trim() || entry.score > 0)
      .map((entry) => entry.category);
  }, [categories, query, proposal.name]);

  async function send(action: "merge" | "reject") {
    if (action === "merge" && !target) return;
    setPending(action);
    try {
      const response = await fetch(`/api/reviewer/category-proposals/${proposal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "merge" ? { action, foodId, categoryId: target?.id } : { action, foodId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; affectedFoods?: number };
      if (!response.ok) {
        showToast(getApiErrorMessage(response.status, data.error), "error");
        return;
      }
      const count = data.affectedFoods ?? proposal.foodCount;
      showToast(
        action === "merge"
          ? `Đã gộp “${proposal.name}” vào “${target?.name}” cho ${count} món.`
          : `Đã từ chối đề xuất “${proposal.name}” (${count} món).`,
        "success",
      );
      onResolved({ proposalId: proposal.id, mergedCategory: action === "merge" ? target : null });
    } catch {
      showToast(getNetworkErrorMessage(), "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-accent-strong/50 bg-accent-soft/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Danh mục đề xuất</p>
          <p className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
            <Tags className="size-4 text-accent-ink" aria-hidden />
            <span className="truncate">{proposal.name}</span>
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-accent-ink">
          {proposal.proposalCount} lượt đề xuất
        </span>
      </div>

      <p className="flex items-start gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary">
        <Info className="size-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
        <span>
          Áp dụng cho <strong>{proposal.foodCount} món</strong> đang dùng đề xuất này. Nếu để Admin xử lý, món được duyệt sẽ tạm
          nằm ở “Khác” khi chưa có danh mục nào khác.
        </span>
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <ResponsivePicker
            open={pickerOpen}
            onOpenChange={(open) => {
              setPickerOpen(open);
              if (!open) setQuery("");
            }}
            title="Gộp vào danh mục có sẵn"
            trigger={(props) => (
              <button
                type="button"
                ref={props.ref as Ref<HTMLButtonElement>}
                aria-expanded={props["aria-expanded"]}
                aria-haspopup={props["aria-haspopup"]}
                onClick={props.onClick}
                disabled={disabled}
                className={cn(
                  "w-full h-11 flex items-center gap-2 rounded-xl border bg-surface px-3.5 text-left text-sm transition-[border-color,box-shadow] disabled:opacity-60 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
                  props["aria-expanded"] ? "border-primary ring-4 ring-primary/15" : "border-border hover:border-primary-line",
                )}
              >
                <GitMerge className="size-4 shrink-0 text-primary" aria-hidden />
                <span className={cn("flex-1 truncate", target ? "font-semibold text-text-primary" : "text-text-secondary")}>
                  {target ? target.name : "Gộp vào danh mục…"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
              </button>
            )}
          >
            <SearchListbox
              query={query}
              onQueryChange={setQuery}
              placeholder="Tìm danh mục"
              inputLabel="Tìm danh mục để gộp"
              sections={[{ id: "categories", options }]}
              getOptionId={(category) => category.id}
              isSelected={(category) => category.id === target?.id}
              onSelect={(category) => {
                setTarget(category);
                setPickerOpen(false);
                setQuery("");
              }}
              renderOption={(category) => (
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="truncate text-sm font-medium text-text-primary">{category.name}</span>
                  <span className="shrink-0 text-xs text-text-secondary">{CATEGORY_GROUP_LABELS[category.group]}</span>
                </div>
              )}
              empty="Không có danh mục khớp — hãy để Admin xử lý nếu cần tạo mới."
            />
          </ResponsivePicker>
        </div>
        <Button
          type="button"
          onClick={() => void send("merge")}
          disabled={disabled || !target}
          isLoading={pending === "merge"}
          leftIcon={<GitMerge className="size-4" aria-hidden />}
        >
          Gộp
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void send("reject")}
          disabled={disabled}
          isLoading={pending === "reject"}
          leftIcon={<XCircle className="size-4 text-accent-ink" aria-hidden />}
        >
          Từ chối đề xuất
        </Button>
      </div>
    </div>
  );
}

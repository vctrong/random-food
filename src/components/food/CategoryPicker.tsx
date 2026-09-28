"use client";

import { useEffect, useId, useMemo, useState, type Ref } from "react";
import { Check, Clock3, Lightbulb, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fuzzyScore } from "@/lib/vietnameseText";
import { Button } from "@/components/ui/Button";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { SearchListbox, type ListboxSection } from "@/components/ui/SearchListbox";
import { CATEGORY_GROUPS, MAX_CATEGORIES_PER_FOOD } from "@/constants/categoryGroups";
import { buildVisibleCategoryChips, getProposalHint } from "@/features/contribute-food/categorySuggest";
import type { CategoryOption } from "@/types/category";

const VISIBLE_CHIP_LIMIT = 7;
const LIMIT_MESSAGE_MS = 3500;

interface CategoryPickerProps {
  categories: CategoryOption[];
  /** Tên món đang gõ — để gợi ý chip. */
  foodName: string;
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  proposalName: string | null;
  onProposalChange: (name: string | null) => void;
  labelledBy: string;
}

const chipBase =
  "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/**
 * Chọn tối đa 3 danh mục (tính cả 1 danh mục đề xuất). Ngoài form chỉ hiện ≤ 7
 * chip: gợi ý từ tên món (không dấu) lên đầu + phổ biến theo foodCount; còn lại
 * nằm trong "Xem tất cả" (popover desktop / bottom sheet mobile).
 */
export function CategoryPicker({
  categories,
  foodName,
  selectedIds,
  onSelectedChange,
  proposalName,
  onProposalChange,
  labelledBy,
}: CategoryPickerProps) {
  const [allOpen, setAllOpen] = useState(false);
  const [allQuery, setAllQuery] = useState("");
  const [isProposing, setIsProposing] = useState(false);
  const [draftProposal, setDraftProposal] = useState("");
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const proposalInputId = useId();

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const totalChosen = selectedIds.length + (proposalName ? 1 : 0);
  const isFull = totalChosen >= MAX_CATEGORIES_PER_FOOD;

  useEffect(() => {
    if (!limitMessage) return;
    const timeout = window.setTimeout(() => setLimitMessage(null), LIMIT_MESSAGE_MS);
    return () => window.clearTimeout(timeout);
  }, [limitMessage]);

  const visibleChips = useMemo(
    () =>
      buildVisibleCategoryChips(
        categories.filter((category) => !selectedIds.includes(category.id)),
        foodName,
        VISIBLE_CHIP_LIMIT,
      ),
    [categories, selectedIds, foodName],
  );

  function warnLimit() {
    setLimitMessage(`Mỗi món tối đa ${MAX_CATEGORIES_PER_FOOD} danh mục thôi nha — bỏ bớt 1 cái rồi chọn tiếp.`);
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((item) => item !== id));
      return;
    }
    if (isFull) {
      warnLimit();
      return;
    }
    onSelectedChange([...selectedIds, id]);
  }

  /** Chọn nhiều danh mục cùng lúc (gợi ý "Cơm + Chay"), bỏ qua cái đã chọn. */
  function selectMany(ids: string[]) {
    const additions = ids.filter((id) => !selectedIds.includes(id));
    if (selectedIds.length + additions.length + (proposalName ? 1 : 0) > MAX_CATEGORIES_PER_FOOD) {
      warnLimit();
      return false;
    }
    onSelectedChange([...selectedIds, ...additions]);
    return true;
  }

  const hint = useMemo(() => getProposalHint(draftProposal, categories), [draftProposal, categories]);

  function closeProposalForm() {
    setIsProposing(false);
    setDraftProposal("");
  }

  function submitProposal() {
    const name = draftProposal.trim().replace(/\s+/g, " ");
    if (name.length < 2) return;
    if (isFull) {
      warnLimit();
      return;
    }
    onProposalChange(name);
    closeProposalForm();
  }

  const allSections: ListboxSection<CategoryOption>[] = useMemo(() => {
    const query = allQuery.trim();
    const matches = query ? categories.filter((category) => fuzzyScore(query, category.name) > 0) : categories;
    return CATEGORY_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      options: matches
        .filter((category) => category.group === group.id)
        .sort((a, b) => (query ? fuzzyScore(query, b.name) - fuzzyScore(query, a.name) : a.name.localeCompare(b.name, "vi"))),
    })).filter((section) => section.options.length > 0);
  }, [categories, allQuery]);

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelledBy}>
      {/* Hàng đã chọn — luôn ở trên cùng */}
      {totalChosen > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Danh mục đã chọn">
          {selectedIds.map((id) => {
            const category = byId.get(id);
            if (!category) return null;
            return (
              <span key={id} className={cn(chipBase, "pr-1 bg-primary-soft border-primary-line text-text-primary")}>
                <Check className="size-3.5 text-primary" strokeWidth={3} aria-hidden />
                <span className="max-w-[12rem] truncate">{category.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Bỏ chọn ${category.name}`}
                  className="size-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            );
          })}
          {proposalName && (
            <span className={cn(chipBase, "pr-1 border-dashed border-accent-strong/60 bg-accent-soft text-text-primary")}>
              <Clock3 className="size-3.5 text-accent-ink" aria-hidden />
              <span className="max-w-[10rem] truncate">{proposalName}</span>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-ink">chờ duyệt</span>
              <button
                type="button"
                onClick={() => onProposalChange(null)}
                aria-label={`Bỏ đề xuất ${proposalName}`}
                className="size-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Chip gợi ý + phổ biến */}
      <div className="flex flex-wrap gap-2">
        {visibleChips.map(({ category, suggested }) => (
          <button
            key={category.id}
            type="button"
            onClick={() => toggle(category.id)}
            className={cn(
              chipBase,
              suggested
                ? "border-accent bg-accent-soft text-text-primary hover:border-accent-strong/60"
                : "border-border bg-surface text-text-secondary hover:text-text-primary hover:border-primary-line",
              isFull && "opacity-60",
            )}
          >
            {suggested ? <Sparkles className="size-3.5 text-accent-ink" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            <span className="max-w-[12rem] truncate">{category.name}</span>
            {suggested && <span className="sr-only">(gợi ý theo tên món)</span>}
          </button>
        ))}

        <ResponsivePicker
          open={allOpen}
          onOpenChange={(open) => {
            setAllOpen(open);
            if (!open) setAllQuery("");
          }}
          title="Tất cả danh mục"
          minWidth={340}
          tallSheet
          trigger={(props) => (
            <button
              type="button"
              ref={props.ref as Ref<HTMLButtonElement>}
              aria-expanded={props["aria-expanded"]}
              aria-haspopup={props["aria-haspopup"]}
              onClick={props.onClick}
              className={cn(chipBase, "border-primary-line bg-surface text-primary hover:bg-primary-soft")}
            >
              Xem tất cả ({categories.length})
            </button>
          )}
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-secondary">
                Đã chọn {totalChosen}/{MAX_CATEGORIES_PER_FOOD}
              </span>
              <Button type="button" size="sm" onClick={() => setAllOpen(false)}>
                Xong
              </Button>
            </div>
          }
        >
          <SearchListbox
            query={allQuery}
            onQueryChange={setAllQuery}
            placeholder="Tìm danh mục (gõ không dấu cũng được)"
            inputLabel="Tìm danh mục"
            multiple
            sections={allSections}
            getOptionId={(category) => category.id}
            isSelected={(category) => selectedIds.includes(category.id)}
            onSelect={(category) => toggle(category.id)}
            renderOption={(category) => (
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="truncate text-sm font-medium text-text-primary">{category.name}</span>
                <span className="shrink-0 text-xs text-text-secondary">{category.foodCount} món</span>
              </div>
            )}
            empty={
              <span>
                Không tìm thấy “{allQuery.trim()}”.{" "}
                {!proposalName && (
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => {
                      setAllOpen(false);
                      setIsProposing(true);
                      setDraftProposal(allQuery.trim());
                      setAllQuery("");
                    }}
                  >
                    Đề xuất danh mục này
                  </button>
                )}
              </span>
            }
          />
          {limitMessage && allOpen && (
            <p className="mx-3 mb-2 rounded-xl bg-warning/15 px-3 py-2 text-xs text-text-primary">
              {limitMessage}
            </p>
          )}
        </ResponsivePicker>
      </div>

      <p role="status" aria-live="polite" className={limitMessage ? "-mt-1 text-xs text-accent-ink" : "sr-only"}>
        {limitMessage}
      </p>

      {/* Đề xuất danh mục mới */}
      {!proposalName &&
        (isProposing ? (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-primary-line bg-primary-soft/40 p-3">
            <label htmlFor={proposalInputId} className="text-sm font-semibold text-text-primary">
              Tên danh mục muốn đề xuất
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id={proposalInputId}
                autoFocus
                value={draftProposal}
                maxLength={40}
                onChange={(event) => setDraftProposal(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitProposal();
                  } else if (event.key === "Escape") {
                    closeProposalForm();
                  }
                }}
                placeholder="Vd: Đồ nướng"
                className="flex-1 min-w-0 h-11 px-4 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary/80 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={submitProposal} disabled={draftProposal.trim().length < 2} className="flex-1 sm:flex-none">
                  Thêm đề xuất
                </Button>
                <Button type="button" variant="outline" onClick={closeProposalForm}>
                  Huỷ
                </Button>
              </div>
            </div>

            {hint.kind === "did_you_mean" && (
              <button
                type="button"
                onClick={() => {
                  if (!selectedIds.includes(hint.category.id)) toggle(hint.category.id);
                  closeProposalForm();
                }}
                className="self-start inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-text-primary bg-surface border border-border hover:border-primary-line hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Lightbulb className="size-4 text-primary" aria-hidden />
                Có phải ý bạn là <strong className="font-bold">{hint.category.name}</strong> không?
              </button>
            )}
            {hint.kind === "combo" && (
              <button
                type="button"
                onClick={() => {
                  if (selectMany(hint.categories.map((category) => category.id))) closeProposalForm();
                }}
                className="self-start inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-text-primary bg-surface border border-border hover:border-primary-line hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Lightbulb className="size-4 text-primary" aria-hidden />
                Chọn <strong className="font-bold">{hint.categories.map((category) => category.name).join(" + ")}</strong> là được nè
              </button>
            )}
            <p className="text-xs text-text-secondary">
              Danh mục đề xuất vẫn được tính là đã chọn — món của bạn không phải chờ. Mỗi món đề xuất tối đa 1 danh mục.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (isFull ? warnLimit() : setIsProposing(true))}
            className="self-start inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:text-primary-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <Plus className="size-4" aria-hidden />
            Không thấy danh mục hợp? Đề xuất danh mục mới
          </button>
        ))}
    </div>
  );
}

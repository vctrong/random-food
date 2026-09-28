"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Store } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { SearchListbox } from "@/components/ui/SearchListbox";
import { HighlightText } from "@/components/ui/HighlightText";
import { RestaurantImage } from "@/components/restaurant/RestaurantImage";
import { useRestaurantSearch } from "@/features/contribute-food/useRestaurantSearch";
import { sendReport } from "@/services/reportService";
import {
  MAX_REPORT_NOTE_LENGTH,
  PLACE_REPORT_REASONS,
  REVIEW_REPORT_REASONS,
  placeReasonTarget,
  type PlaceReportReason,
  type ReportReason,
  type ReportTargetType,
} from "@/constants/reports";
import type { RestaurantOption } from "@/types/restaurant";

type ReportFormProps =
  | {
      kind: "review";
      reviewId: string;
      onSubmitted: (target: { targetType: ReportTargetType; targetId: string }) => void;
      onCancel: () => void;
    }
  | {
      kind: "place";
      foodId: string;
      restaurantId: string | null;
      /** Đối tượng user đã báo cáo — lý do nhắm vào đó bị khoá. */
      reported: { food: boolean; restaurant: boolean };
      onSubmitted: (target: { targetType: ReportTargetType; targetId: string }) => void;
      onCancel: () => void;
    };

interface ReasonChip {
  id: ReportReason;
  label: string;
  disabledNote?: string;
}

/**
 * Form báo cáo (chip lý do chọn 1 + ghi chú). Đặt trong ResponsivePicker (popover
 * desktop / bottom sheet mobile). "Khác" → ghi chú bắt buộc; "Trùng với quán khác" →
 * phải chọn quán bị trùng. Lý do món/quán tự quyết định báo cáo nhắm vào món hay quán.
 */
export function ReportForm(props: ReportFormProps) {
  const ids = { reason: useId(), note: useId(), duplicate: useId() };
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [duplicateOf, setDuplicateOf] = useState<RestaurantOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mở form từ menu "⋯" thì mục menu vừa bấm biến mất — chuyển focus vào chip đầu (không cuộn trang).
  useEffect(() => {
    const raf = requestAnimationFrame(() => chipRefs.current.find(Boolean)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, []);

  const restaurantId = props.kind === "place" ? props.restaurantId : null;
  const reasons: ReasonChip[] =
    props.kind === "review"
      ? REVIEW_REPORT_REASONS.map((item) => ({ id: item.id, label: item.label }))
      : PLACE_REPORT_REASONS.filter((item) => item.target === "food" || restaurantId).map((item) => ({
          id: item.id,
          label: item.label,
          disabledNote: props.reported[item.target] ? "đã báo cáo" : undefined,
        }));

  const isDuplicate = reason === "duplicate";
  const search = useRestaurantSearch(isDuplicate && !duplicateOf, null);
  const noteRequired = reason === "other";
  const noteValid = !noteRequired || note.trim().length > 0;
  const canSubmit = Boolean(reason) && noteValid && (!isDuplicate || Boolean(duplicateOf)) && !isSubmitting;

  function choose(index: number) {
    const chip = reasons[index];
    if (!chip || chip.disabledNote) return;
    setReason(chip.id);
    setError(null);
    if (chip.id !== "duplicate") setDuplicateOf(null);
  }

  function handleChipKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    for (let offset = 1; offset <= reasons.length; offset++) {
      const next = (index + step * offset + reasons.length) % reasons.length;
      if (!reasons[next].disabledNote) {
        chipRefs.current[next]?.focus();
        choose(next);
        return;
      }
    }
  }

  async function submit() {
    if (!canSubmit || !reason) return;
    const target: { targetType: ReportTargetType; targetId: string } =
      props.kind === "review"
        ? { targetType: "review", targetId: props.reviewId }
        : placeReasonTarget(reason as PlaceReportReason) === "restaurant" && props.restaurantId
          ? { targetType: "restaurant", targetId: props.restaurantId }
          : { targetType: "food", targetId: props.foodId };

    setIsSubmitting(true);
    setError(null);
    const result = await sendReport({
      ...target,
      reason,
      note: note.trim() || undefined,
      duplicateOfRestaurantId: isDuplicate ? (duplicateOf?.id ?? null) : undefined,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    props.onSubmitted(target);
  }

  const focusIndex = Math.max(0, reasons.findIndex((chip) => chip.id === reason));

  return (
    <form
      className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-1 sm:p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm text-text-secondary">
        {props.kind === "review"
          ? "Đánh giá này có vấn đề gì vậy? Tụi mình sẽ xem xét và không tiết lộ bạn là người báo cáo."
          : "Thông tin nào chưa đúng vậy? Báo tụi mình để cập nhật cho mọi người nha."}
      </p>

      <div className="flex flex-col gap-2">
        <FieldLabel id={ids.reason} required valid={Boolean(reason)}>
          Lý do
        </FieldLabel>
        <div role="radiogroup" aria-labelledby={ids.reason} className="flex flex-wrap gap-2">
          {reasons.map((chip, index) => {
            const selected = chip.id === reason;
            const disabled = Boolean(chip.disabledNote);
            return (
              <button
                key={chip.id}
                ref={(element) => {
                  chipRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={disabled || undefined}
                tabIndex={index === focusIndex ? 0 : -1}
                onClick={() => choose(index)}
                onKeyDown={(event) => handleChipKeyDown(event, index)}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-11 sm:min-h-10 px-3.5 rounded-full border text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  selected
                    ? "bg-primary-strong border-primary-strong text-white"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-primary-line",
                  disabled && "opacity-50 cursor-not-allowed hover:border-border hover:text-text-secondary",
                )}
              >
                {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                {chip.label}
                {chip.disabledNote && <span className="text-xs">· {chip.disabledNote}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {isDuplicate && (
        <div className="flex flex-col gap-2">
          <FieldLabel id={ids.duplicate} required valid={Boolean(duplicateOf)}>
            Trùng với quán nào?
          </FieldLabel>
          {duplicateOf ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary-line bg-primary-soft/60 p-2.5">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
                <RestaurantImage images={duplicateOf.image} alt={duplicateOf.name} sizes="40px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">{duplicateOf.name}</span>
                <span className="block truncate text-xs text-text-secondary">{shortenAddress(duplicateOf.address)}</span>
              </span>
              <button
                type="button"
                onClick={() => setDuplicateOf(null)}
                className="shrink-0 min-h-10 px-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Đổi
              </button>
            </div>
          ) : (
            <div className="flex h-72 flex-col overflow-hidden rounded-xl border border-border" aria-labelledby={ids.duplicate}>
              <SearchListbox
                query={search.query}
                onQueryChange={search.setQuery}
                placeholder="Tìm quán bị trùng theo tên hoặc địa chỉ"
                inputLabel="Tìm quán bị trùng"
                sections={[{ id: "restaurants", options: search.items.filter((item) => item.id !== restaurantId) }]}
                getOptionId={(item) => item.id}
                onSelect={setDuplicateOf}
                status={search.status}
                onRetry={search.retry}
                hasMore={search.hasMore}
                isLoadingMore={search.isLoadingMore}
                onLoadMore={search.loadMore}
                renderOption={(item) => (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Store className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        <HighlightText text={item.name} query={search.appliedQuery} />
                      </span>
                      <span className="block truncate text-xs text-text-secondary">{shortenAddress(item.address)}</span>
                    </span>
                  </div>
                )}
                empty="Không thấy quán nào khớp."
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={ids.note} required={noteRequired} valid={noteRequired && noteValid}>
          Ghi chú
        </FieldLabel>
        <textarea
          id={ids.note}
          value={note}
          rows={3}
          maxLength={MAX_REPORT_NOTE_LENGTH}
          aria-required={noteRequired || undefined}
          onChange={(event) => setNote(event.target.value)}
          placeholder={noteRequired ? "Kể tụi mình nghe vấn đề là gì nha" : "Thêm chi tiết giúp tụi mình xử lý nhanh hơn"}
          className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/80 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
        <span className="self-end text-xs tabular-nums text-text-secondary">
          {note.length}/{MAX_REPORT_NOTE_LENGTH}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={!canSubmit} isLoading={isSubmitting}>
          Gửi báo cáo
        </Button>
      </div>
    </form>
  );
}

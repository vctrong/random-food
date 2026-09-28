"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Hourglass,
  Lock,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Send,
  Star,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { HistoryWithFood } from "@/features/history-log/historyLogic";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatClockTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MAX_REVIEW_COMMENT_LENGTH, REVIEW_CREATE_WINDOW_HOURS, REVIEW_EDIT_WINDOW_HOURS } from "@/constants/limits";
import { useNow } from "@/features/history-log/useNow";
import { formatRemainingTime, getCreateReviewRemainingMs, getEditReviewRemainingMs } from "@/lib/reviewWindow";

interface HistoryTimelineItemProps {
  entry: HistoryWithFood;
  isRemoving: boolean;
  onToggleSaved: (id: string) => void;
  onRemove: (id: string) => void;
  onSubmitReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onUpdateReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onRemoveReview: (id: string) => Promise<void>;
}

export function HistoryTimelineItem({
  entry,
  isRemoving,
  onToggleSaved,
  onRemove,
  onSubmitReview,
  onUpdateReview,
  onRemoveReview,
}: HistoryTimelineItemProps) {
  const { food } = entry;
  const eatingLevelLabel = entry.eatingLevel ? EATING_LEVEL_LABELS[entry.eatingLevel] : null;
  const coverImage = food.images[0] ?? null;

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl bg-surface shadow-sm hover:shadow-md transition-all duration-250 flex flex-col gap-4",
        isRemoving && "opacity-0 scale-95 pointer-events-none",
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-primary-soft">
            {coverImage ? (
              <Image
                src={coverImage}
                alt={`Ảnh minh hoạ ${food.name}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary">
                <UtensilsCrossed className="size-6" aria-hidden />
              </div>
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {formatClockTime(entry.timestamp)}
              </span>
              {eatingLevelLabel && (
                <span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary text-xs font-semibold">
                  {eatingLevelLabel}
                </span>
              )}
              {entry.wasEaten && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Đã ăn món này
                </span>
              )}
            </div>
            <h3 className="font-semibold text-text-primary truncate">{food.name}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-primary">
                {food.priceMin !== null ? `~${food.priceMin.toLocaleString("vi-VN")}đ` : "Chưa cập nhật giá"}
              </span>
              <span className="text-border">•</span>
              <span className="text-text-secondary truncate">
                {food.restaurant ? `${food.restaurant.name}, ${food.restaurant.address}` : "Chưa rõ quán"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleSaved(entry.id)}
              title={entry.isSaved ? "Đã lưu yêu thích" : "Lưu vào danh sách yêu thích"}
              className={cn(
                "p-2 rounded-full transition-colors",
                entry.isSaved
                  ? "text-accent-ink bg-accent-soft"
                  : "text-text-secondary hover:text-accent-ink hover:bg-accent-soft",
              )}
            >
              <Star className="size-5" fill={entry.isSaved ? "currentColor" : "none"} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              title="Xoá khỏi lịch sử"
              className="p-2 rounded-full text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <Link
            href={entry.eatingLevel ? `/random?muc-do=${entry.eatingLevel}` : "/random"}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-soft hover:bg-primary-strong hover:text-white text-primary text-sm font-medium transition-colors"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            <span>Random lại món này</span>
          </Link>
        </div>
      </div>

      <ReviewSection
        entry={entry}
        onSubmitReview={onSubmitReview}
        onUpdateReview={onUpdateReview}
        onRemoveReview={onRemoveReview}
      />
    </div>
  );
}

/**
 * Thời hạn đánh giá: viết trong 72h kể từ lần check-in này, sửa trong 24h kể từ
 * lúc tạo review. Xoá sau 24h thì không thể đánh giá lại món này (server xoá mềm).
 */
function ReviewSection({
  entry,
  onSubmitReview,
  onUpdateReview,
  onRemoveReview,
}: {
  entry: HistoryWithFood;
  onSubmitReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onUpdateReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onRemoveReview: (id: string) => Promise<void>;
}) {
  const now = useNow();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chờ client có giờ thật mới hiển thị để trạng thái hạn đánh giá không lệch với SSR.
  if (now === null) return null;

  const { review } = entry;

  if (review?.isDeleted) {
    return (
      <ReviewNotice>
        Bạn đã xoá đánh giá món này sau {REVIEW_EDIT_WINDOW_HOURS} giờ nên không thể đánh giá lại.
      </ReviewNotice>
    );
  }

  if (review) {
    const editRemainingMs = getEditReviewRemainingMs(review.createdAt, now);
    const canEdit = editRemainingMs > 0;

    if (isComposerOpen && canEdit) {
      return (
        <ReviewComposer
          initialRating={review.rating}
          initialComment={review.comment ?? ""}
          submitLabel="Lưu thay đổi"
          onCancel={() => setIsComposerOpen(false)}
          onSubmit={async (rating, comment) => {
            const ok = await onUpdateReview(entry.id, rating, comment);
            if (ok) setIsComposerOpen(false);
            return ok;
          }}
        />
      );
    }

    return (
      <div className="rounded-xl bg-primary-soft/40 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className="size-4"
                fill={value <= review.rating ? "#F4C95D" : "none"}
                stroke={value <= review.rating ? "#F4C95D" : "currentColor"}
                aria-hidden
              />
            ))}
            <span className="text-xs text-text-secondary ml-1">Đánh giá của bạn</span>
          </div>
          {!isConfirmingDelete && (
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Sửa
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-red-600 transition-colors"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Xoá
              </button>
            </div>
          )}
        </div>
        {review.comment && <p className="text-sm text-text-primary">{review.comment}</p>}

        {isConfirmingDelete ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-surface border border-border p-2.5">
            <p className="text-xs text-text-primary">
              {canEdit
                ? "Xoá đánh giá này? Bạn vẫn có thể viết lại nếu còn trong thời hạn đánh giá."
                : `Xoá đánh giá này? Vì đã quá ${REVIEW_EDIT_WINDOW_HOURS} giờ nên sau khi xoá bạn sẽ không thể đánh giá lại món này.`}
            </p>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="px-3 py-1 rounded-full text-xs text-text-secondary hover:bg-primary-soft transition-colors disabled:opacity-60"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  await onRemoveReview(entry.id);
                  setIsDeleting(false);
                  setIsConfirmingDelete(false);
                }}
                disabled={isDeleting}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
              >
                {isDeleting ? "Đang xoá..." : "Xoá đánh giá"}
              </button>
            </div>
          </div>
        ) : canEdit ? (
          <p className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Hourglass className="size-3.5 shrink-0" aria-hidden />
            Còn {formatRemainingTime(editRemainingMs)} để sửa đánh giá
          </p>
        ) : (
          <p className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            Đã khoá chỉnh sửa (quá {REVIEW_EDIT_WINDOW_HOURS} giờ kể từ lúc đánh giá)
          </p>
        )}
      </div>
    );
  }

  const createRemainingMs = getCreateReviewRemainingMs(entry.timestamp, now);

  if (createRemainingMs === 0) {
    return (
      <ReviewNotice>
        Đã quá {REVIEW_CREATE_WINDOW_HOURS} giờ kể từ lúc ăn nên không thể đánh giá lần ăn này nữa.
      </ReviewNotice>
    );
  }

  if (isComposerOpen) {
    return (
      <ReviewComposer
        submitLabel="Gửi đánh giá"
        onCancel={() => setIsComposerOpen(false)}
        onSubmit={async (rating, comment) => {
          const ok = await onSubmitReview(entry.id, rating, comment);
          if (ok) setIsComposerOpen(false);
          return ok;
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button
        type="button"
        onClick={() => setIsComposerOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-soft hover:bg-accent/20 text-accent-ink text-sm font-medium transition-colors"
      >
        <MessageSquareText className="size-4" aria-hidden />
        Đánh giá món này
      </button>
      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
        <Hourglass className="size-3.5 shrink-0" aria-hidden />
        Còn {formatRemainingTime(createRemainingMs)} để đánh giá
      </span>
    </div>
  );
}

function ReviewNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-primary-soft/40 px-3 py-2 text-xs text-text-secondary">
      <Lock className="size-3.5 shrink-0 mt-px" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function ReviewComposer({
  initialRating = 5,
  initialComment = "",
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialRating?: number;
  initialComment?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(rating, comment);
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-xl bg-primary-soft/40 border border-border p-3 flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <span className="text-sm text-text-secondary mr-1">Chất lượng:</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(null)}
            className="p-0.5"
            aria-label={`${value} sao`}
          >
            <Star
              className="size-6"
              fill={value <= (hoverRating ?? rating) ? "#F4C95D" : "none"}
              stroke={value <= (hoverRating ?? rating) ? "#F4C95D" : "currentColor"}
              aria-hidden
            />
          </button>
        ))}
        <span className="text-sm font-semibold text-text-primary ml-1">{rating}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_REVIEW_COMMENT_LENGTH))}
        rows={2}
        placeholder="Chia sẻ thêm cảm nhận của bạn về món này (không bắt buộc)..."
        className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-secondary">{comment.length}/{MAX_REVIEW_COMMENT_LENGTH}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-full text-sm text-text-secondary hover:bg-surface transition-colors disabled:opacity-60"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-strong hover:bg-primary-strong-hover text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden />
            {isSubmitting ? "Đang gửi..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, MessageSquareText, RefreshCw, Send, Star, Trash2, UtensilsCrossed, X } from "lucide-react";
import type { HistoryWithFood } from "@/features/history-log/historyLogic";
import { EATING_LEVEL_LABELS } from "@/constants/categories";
import { formatClockTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MAX_REVIEW_COMMENT_LENGTH } from "@/constants/limits";

interface HistoryTimelineItemProps {
  entry: HistoryWithFood;
  isRemoving: boolean;
  onToggleSaved: (id: string) => void;
  onRemove: (id: string) => void;
  onSubmitReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onRemoveReview: (id: string) => void;
}

export function HistoryTimelineItem({
  entry,
  isRemoving,
  onToggleSaved,
  onRemove,
  onSubmitReview,
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

      <ReviewSection entry={entry} onSubmitReview={onSubmitReview} onRemoveReview={onRemoveReview} />
    </div>
  );
}

function ReviewSection({
  entry,
  onSubmitReview,
  onRemoveReview,
}: {
  entry: HistoryWithFood;
  onSubmitReview: (id: string, rating: number, comment: string) => Promise<boolean>;
  onRemoveReview: (id: string) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  if (entry.review) {
    return (
      <div className="rounded-xl bg-primary-soft/40 p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className="size-4"
                fill={value <= entry.review!.rating ? "#F4C95D" : "none"}
                stroke={value <= entry.review!.rating ? "#F4C95D" : "currentColor"}
                aria-hidden
              />
            ))}
            <span className="text-xs text-text-secondary ml-1">Đánh giá của bạn</span>
          </div>
          <button
            type="button"
            onClick={() => onRemoveReview(entry.id)}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-red-600 transition-colors"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Xoá
          </button>
        </div>
        {entry.review.comment && <p className="text-sm text-text-primary">{entry.review.comment}</p>}
      </div>
    );
  }

  if (isComposerOpen) {
    return (
      <ReviewComposer
        entryId={entry.id}
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
    <button
      type="button"
      onClick={() => setIsComposerOpen(true)}
      className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-soft hover:bg-accent/20 text-accent-ink text-sm font-medium transition-colors"
    >
      <MessageSquareText className="size-4" aria-hidden />
      Đánh giá món này
    </button>
  );
}

function ReviewComposer({
  onCancel,
  onSubmit,
}: {
  entryId: string;
  onCancel: () => void;
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
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
            {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
}

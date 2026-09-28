"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { EyeOff, MessageSquareText, Star } from "lucide-react";
import { formatRelativeTime, isAllowedImageHost } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { ReviewActionsMenu } from "@/components/food/ReviewActionsMenu";
import { cancelReport } from "@/services/reportService";
import { REPORT_THANK_YOU_TOAST } from "@/constants/reports";

interface ReviewApiRecord {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
  isMine: boolean;
  reportedByMe: boolean;
  canUndoReport: boolean;
}

interface FoodReviewsSectionProps {
  foodId: string;
  avgRating: number;
  ratingCount: number;
}

/**
 * Danh sách đánh giá công khai thật của 1 món (GET /api/reviews?foodId=...).
 * Không có filter/breakdown giả — chỉ avg + count thật (từ Food.avgRating/ratingCount)
 * và danh sách review thật, có fallback khi chưa có đánh giá nào.
 */
export function FoodReviewsSection({ foodId, avgRating, ratingCount }: FoodReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewApiRecord[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { status } = useSession();
  const { showToast } = useToast();

  function patchReview(id: string, changes: Partial<ReviewApiRecord>) {
    setReviews((prev) => prev?.map((review) => (review.id === id ? { ...review, ...changes } : review)) ?? prev);
  }

  function handleReported(id: string) {
    // Ẩn ngay với chính người báo cáo, thay bằng dòng "Bạn đã báo cáo · Hoàn tác".
    patchReview(id, { reportedByMe: true, canUndoReport: true });
    showToast(REPORT_THANK_YOU_TOAST, "success");
  }

  async function handleUndo(id: string) {
    const result = await cancelReport("review", id);
    if (!result.ok) {
      showToast(result.error, "error");
      if (result.error.includes("đã được xử lý")) patchReview(id, { canUndoReport: false });
      return;
    }
    patchReview(id, { reportedByMe: false, canUndoReport: false });
    showToast("Đã hoàn tác báo cáo.", "info");
  }

  useEffect(() => {
    // key={foodId} ở nơi gọi (RandomFoodResult) đảm bảo component remount mỗi
    // khi đổi món — effect này chỉ chạy đúng 1 lần lúc mount, không cần reset state.
    let cancelled = false;
    fetch(`/api/reviews?foodId=${encodeURIComponent(foodId)}&page=1`)
      .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
      .then((data: { items: ReviewApiRecord[]; total: number }) => {
        if (cancelled) return;
        setReviews(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
          setTotal(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [foodId]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/reviews?foodId=${encodeURIComponent(foodId)}&page=${nextPage}`);
      if (res.ok) {
        const data = (await res.json()) as { items: ReviewApiRecord[]; total: number };
        setReviews((prev) => [...(prev ?? []), ...data.items]);
        setTotal(data.total);
        setPage(nextPage);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-primary" aria-hidden />
          <h2 className="font-heading text-lg font-bold text-text-primary">Đánh giá từ thực khách</h2>
        </div>
        {ratingCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{avgRating.toFixed(1)}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className="size-4"
                  fill={value <= Math.round(avgRating) ? "#F4C95D" : "none"}
                  stroke={value <= Math.round(avgRating) ? "#F4C95D" : "currentColor"}
                  aria-hidden
                />
              ))}
            </div>
            <span className="text-sm text-text-secondary">({ratingCount} đánh giá)</span>
          </div>
        )}
      </div>

      {reviews === null ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-primary-soft/40 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="Chưa có đánh giá nào"
          description="Món này chưa có đánh giá thật từ thực khách. Đánh giá chỉ có thể gửi sau khi xác nhận đã ăn ở trang Lịch sử."
        />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {reviews.map((review) =>
              review.reportedByMe ? (
                <ReportedReviewRow key={review.id} canUndo={review.canUndoReport} onUndo={() => void handleUndo(review.id)} />
              ) : (
                <ReviewItem
                  key={review.id}
                  review={review}
                  isAuthenticated={status === "authenticated"}
                  onReported={() => handleReported(review.id)}
                />
              ),
            )}
          </div>
          {reviews.length < total && (
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-5 py-2 rounded-full border border-border bg-surface hover:bg-primary-soft text-primary text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
              >
                {isLoadingMore ? "Đang tải..." : `Xem thêm đánh giá (còn ${total - reviews.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportedReviewRow({ canUndo, onUndo }: { canUndo: boolean; onUndo: () => void }) {
  return (
    <div className="py-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
      <EyeOff className="size-4 shrink-0" aria-hidden />
      <span>Bạn đã báo cáo đánh giá này</span>
      {canUndo && (
        <>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-9 rounded-lg px-1.5 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Hoàn tác
          </button>
        </>
      )}
    </div>
  );
}

function ReviewItem({
  review,
  isAuthenticated,
  onReported,
}: {
  review: ReviewApiRecord;
  isAuthenticated: boolean;
  onReported: () => void;
}) {
  const initials = review.user.name.slice(0, 2).toUpperCase();

  return (
    <div className="group py-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {isAllowedImageHost(review.user.avatarUrl) ? (
            <Image
              src={review.user.avatarUrl as string}
              alt={review.user.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-sm border border-border">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-text-primary text-sm">{review.user.name}</p>
            <p className="text-xs text-text-secondary">{formatRelativeTime(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5" role="img" aria-label={`${review.rating} trên 5 sao`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className="size-3.5"
                fill={value <= review.rating ? "#F4C95D" : "none"}
                stroke={value <= review.rating ? "#F4C95D" : "currentColor"}
                aria-hidden
              />
            ))}
          </div>
          {!review.isMine && (
            <ReviewActionsMenu
              reviewId={review.id}
              authorName={review.user.name}
              isAuthenticated={isAuthenticated}
              onReported={onReported}
            />
          )}
        </div>
      </div>
      {review.comment && <p className="text-sm text-text-secondary leading-relaxed">{review.comment}</p>}
    </div>
  );
}

import type { HistoryEntry, HistoryReviewSummary } from "@/types/history";
import type { Food } from "@/types/food";
import { mapExperiencesToHistoryEntries } from "@/features/history-log/historyLogic";

/**
 * Lớp duy nhất "biết" data lịch sử đến từ đâu — gọi qua API route
 * `/api/experiences` (+ `/api/favorites`, `/api/reviews/mine` để ghép
 * isSaved/review thật) thay vì localStorage. Chỉ dùng ở phía client
 * ("use client" hooks/component).
 */

interface ExperienceApiRecord {
  id: string;
  foodId: string | null;
  restaurantId: string;
  createdAt: string;
}

interface FavoriteApiRecord {
  foodId: string;
}

interface MyReviewApiRecord {
  id: string;
  foodId: string;
  rating: number;
  comment: string | null;
}

export async function getAllHistory(allFoods: Food[]): Promise<HistoryEntry[]> {
  try {
    const [experiencesRes, favoritesRes, reviewsRes] = await Promise.all([
      fetch("/api/experiences", { cache: "no-store" }),
      fetch("/api/favorites", { cache: "no-store" }),
      fetch("/api/reviews/mine", { cache: "no-store" }),
    ]);

    const experiences = experiencesRes.ok ? ((await experiencesRes.json()) as ExperienceApiRecord[]) : [];
    const favorites = favoritesRes.ok ? ((await favoritesRes.json()) as FavoriteApiRecord[]) : [];
    const myReviews = reviewsRes.ok ? ((await reviewsRes.json()) as MyReviewApiRecord[]) : [];
    const favoriteFoodIds = new Set(favorites.map((favorite) => favorite.foodId));
    const reviewsByFoodId = new Map<string, HistoryReviewSummary>(
      myReviews.map((review) => [review.foodId, { id: review.id, rating: review.rating, comment: review.comment }]),
    );

    return mapExperiencesToHistoryEntries(experiences, favoriteFoodIds, allFoods, reviewsByFoodId);
  } catch {
    return [];
  }
}

/** Ghi 1 lượt "chốt ăn" — cần restaurantId của món (Experience gắn với quán). */
export async function addHistoryEntry(input: { foodId: string; restaurantId: string }): Promise<boolean> {
  try {
    const response = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId: input.foodId, restaurantId: input.restaurantId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeHistoryEntry(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/experiences/${encodeURIComponent(id)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Không có endpoint xoá hàng loạt riêng — xoá từng entry qua DELETE (đã idempotent). */
export async function clearAllHistory(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => removeHistoryEntry(id)));
}

/** Gửi đánh giá cho 1 lượt check-in (experienceId) — chỉ khả dụng khi đã "đã ăn món này". */
export async function submitReview(
  experienceId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceId, rating, ...(comment.trim() && { comment: comment.trim() }) }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!response.ok) return { ok: false, error: body.error ?? "Không thể gửi đánh giá." };
    return { ok: true, id: body.id };
  } catch {
    return { ok: false, error: "Không thể gửi đánh giá, vui lòng thử lại." };
  }
}

export async function deleteMyReview(reviewId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

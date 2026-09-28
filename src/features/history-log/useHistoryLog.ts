"use client";

import { useMemo, useState } from "react";
import type { EatingLevel, Food } from "@/types/food";
import type { HistoryEntry } from "@/types/history";
import {
  removeHistoryEntry,
  clearAllHistory,
  submitReview,
  updateMyReview,
  deleteMyReview,
} from "@/services/historyService";
import { addSavedFood, removeSavedFood } from "@/services/savedFoodService";
import { useToast } from "@/components/ui/ToastProvider";
import { REVIEW_EDIT_WINDOW_HOURS } from "@/constants/limits";
import {
  computeEatingLevelBreakdown,
  computeStats,
  computeTopMealTimeInsight,
  filterAndSortHistory,
  groupByDate,
  joinHistoryWithFood,
  type QuickFilter,
  type SortOrder,
} from "./historyLogic";

interface UseHistoryLogOptions {
  initialEntries: HistoryEntry[];
  allFoods: Food[];
  totalFoodsInMenu: number;
}

export function useHistoryLog({ initialEntries, allFoods, totalFoodsInMenu }: UseHistoryLogOptions) {
  const [rawEntries, setRawEntries] = useState<HistoryEntry[]>(initialEntries);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [eatingLevel, setEatingLevel] = useState<EatingLevel | "all">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const { showToast } = useToast();

  const entries = useMemo(() => joinHistoryWithFood(rawEntries, allFoods), [rawEntries, allFoods]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      saved: entries.filter((e) => e.isSaved).length,
      eaten: entries.filter((e) => e.wasEaten).length,
    }),
    [entries],
  );

  const filteredEntries = useMemo(
    () => filterAndSortHistory(entries, { search, eatingLevel, quickFilter, sortOrder }),
    [entries, search, eatingLevel, quickFilter, sortOrder],
  );

  const groups = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);
  const stats = useMemo(() => computeStats(entries, totalFoodsInMenu), [entries, totalFoodsInMenu]);
  const eatingLevelBreakdown = useMemo(() => computeEatingLevelBreakdown(entries), [entries]);
  const topMealTimeInsight = useMemo(() => computeTopMealTimeInsight(entries), [entries]);

  /** Xoá thật qua API — rollback nếu lỗi. */
  const removeEntry = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    const snapshot = rawEntries;
    window.setTimeout(async () => {
      setRawEntries((prev) => prev.filter((e) => e.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const ok = await removeHistoryEntry(id);
      if (!ok) {
        setRawEntries(snapshot);
        showToast("Không thể xoá mục lịch sử này, vui lòng thử lại.", "error");
      }
    }, 250);
  };

  const clearAll = async () => {
    const snapshot = rawEntries;
    setRawEntries([]);
    try {
      await clearAllHistory(snapshot.map((e) => e.id));
    } catch {
      setRawEntries(snapshot);
      showToast("Không thể xoá toàn bộ lịch sử, vui lòng thử lại.", "error");
    }
  };

  /** Bookmark từ Lịch sử — cập nhật mọi entry cùng foodId (isSaved thật ra là thuộc tính của món, không của từng lần check-in). */
  const toggleSaved = async (id: string) => {
    const entry = rawEntries.find((e) => e.id === id);
    if (!entry) return;
    const nextSaved = !entry.isSaved;
    const snapshot = rawEntries;

    setRawEntries((prev) => prev.map((e) => (e.foodId === entry.foodId ? { ...e, isSaved: nextSaved } : e)));

    const ok = nextSaved ? await addSavedFood(entry.foodId) : await removeSavedFood(entry.foodId);
    if (!ok) {
      setRawEntries(snapshot);
      showToast("Không thể cập nhật trạng thái đã lưu, vui lòng thử lại.", "error");
    }
  };

  /** Gửi đánh giá — cập nhật review cho mọi entry cùng foodId (1 review/món, không phải/lần check-in). */
  const submitEntryReview = async (entryId: string, rating: number, comment: string) => {
    const entry = rawEntries.find((e) => e.id === entryId);
    if (!entry) return false;

    const result = await submitReview(entryId, rating, comment);
    if (!result.ok || !result.id) {
      showToast(result.error ?? "Không thể gửi đánh giá.", "error");
      return false;
    }

    setRawEntries((prev) =>
      prev.map((e) =>
        e.foodId === entry.foodId
          ? {
              ...e,
              review: {
                id: result.id!,
                rating,
                comment: comment.trim() || null,
                createdAt: new Date().toISOString(),
                isDeleted: false,
              },
            }
          : e,
      ),
    );
    showToast("Đã gửi đánh giá của bạn!", "success");
    return true;
  };

  /** Sửa đánh giá (trong 24h) — cập nhật review cho mọi entry cùng foodId. */
  const updateEntryReview = async (entryId: string, rating: number, comment: string) => {
    const entry = rawEntries.find((e) => e.id === entryId);
    if (!entry?.review) return false;
    const review = entry.review;

    const result = await updateMyReview(review.id, rating, comment);
    if (!result.ok) {
      showToast(result.error ?? "Không thể sửa đánh giá.", "error");
      return false;
    }

    setRawEntries((prev) =>
      prev.map((e) =>
        e.foodId === entry.foodId ? { ...e, review: { ...review, rating, comment: comment.trim() || null } } : e,
      ),
    );
    showToast("Đã cập nhật đánh giá của bạn!", "success");
    return true;
  };

  /**
   * Xoá đánh giá. Trong 24h: xoá hẳn (review = null, còn hạn 72h thì viết lại được).
   * Sau 24h: server xoá mềm → giữ review với isDeleted để UI báo không thể đánh giá lại.
   */
  const removeEntryReview = async (entryId: string) => {
    const entry = rawEntries.find((e) => e.id === entryId);
    if (!entry?.review) return;
    const review = entry.review;

    const result = await deleteMyReview(review.id);
    if (!result.ok) {
      showToast("Không thể xoá đánh giá, vui lòng thử lại.", "error");
      return;
    }

    setRawEntries((prev) =>
      prev.map((e) =>
        e.foodId === entry.foodId ? { ...e, review: result.locked ? { ...review, isDeleted: true } : null } : e,
      ),
    );
    showToast(
      result.locked
        ? `Đã xoá đánh giá. Vì đã quá ${REVIEW_EDIT_WINDOW_HOURS} giờ nên bạn không thể đánh giá lại món này.`
        : "Đã xoá đánh giá.",
      "success",
    );
  };

  return {
    entries,
    groups,
    stats,
    eatingLevelBreakdown,
    topMealTimeInsight,
    counts,
    removingIds,
    search,
    setSearch,
    eatingLevel,
    setEatingLevel,
    quickFilter,
    setQuickFilter,
    sortOrder,
    setSortOrder,
    removeEntry,
    clearAll,
    toggleSaved,
    submitEntryReview,
    updateEntryReview,
    removeEntryReview,
    isEmpty: entries.length === 0,
    hasNoFilterMatch: entries.length > 0 && filteredEntries.length === 0,
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { EatingLevel, Food } from "@/types/food";
import type { HistoryEntry } from "@/types/history";
import {
  getAllHistory,
  removeHistoryEntry,
  clearAllHistory,
  updateHistoryEntry,
} from "@/services/historyService";
import { addSavedFood, removeSavedFood } from "@/services/savedFoodService";
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

  useEffect(() => {
    // SSR không đọc được localStorage — đồng bộ lại dữ liệu thật ngay sau khi mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRawEntries(getAllHistory());
  }, []);

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

  /** Xoá thật — ghi vào localStorage qua historyService, không chỉ ẩn trên UI. */
  const removeEntry = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      removeHistoryEntry(id);
      setRawEntries((prev) => prev.filter((e) => e.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 250);
  };

  const clearAll = () => {
    clearAllHistory();
    setRawEntries([]);
  };

  /** Bookmark từ Lịch sử cũng đồng bộ ngược vào danh sách Đã lưu. */
  const toggleSaved = (id: string) => {
    const entry = rawEntries.find((e) => e.id === id);
    if (!entry) return;
    const nextSaved = !entry.isSaved;
    updateHistoryEntry(id, { isSaved: nextSaved });
    if (nextSaved) addSavedFood(entry.foodId);
    else removeSavedFood(entry.foodId);
    setRawEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isSaved: nextSaved } : e)));
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
    isEmpty: entries.length === 0,
    hasNoFilterMatch: entries.length > 0 && filteredEntries.length === 0,
  };
}

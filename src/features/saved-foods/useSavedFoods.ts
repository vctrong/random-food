"use client";

import { useEffect, useMemo, useState } from "react";
import type { Food } from "@/types/food";
import {
  computeSavedStats,
  filterAndSortSaved,
  joinSavedWithFood,
  pickRandomSavedFood,
  type SavedSortOrder,
} from "./savedFoodsLogic";
import { getSavedFoodRecords, removeSavedFood, type SavedFoodRecord } from "@/services/savedFoodService";
import { addHistoryEntry } from "@/services/historyService";
import { readSoundPreference } from "@/features/settings/settingsLogic";
import { playRandomizeChime } from "@/lib/sound";
import { useToast } from "@/components/ui/ToastProvider";

const MODAL_TRANSITION_MS = 350;

interface UseSavedFoodsOptions {
  initialRecords: SavedFoodRecord[];
  allFoods: Food[];
  totalCategoriesAvailable: number;
}

export function useSavedFoods({
  initialRecords,
  allFoods,
  totalCategoriesAvailable,
}: UseSavedFoodsOptions) {
  const [records, setRecords] = useState<SavedFoodRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [sortOrder, setSortOrder] = useState<SavedSortOrder>("recent");

  const [modalFood, setModalFood] = useState<Food | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // SSR không đọc được localStorage — đồng bộ lại dữ liệu thật ngay sau khi mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(getSavedFoodRecords());
  }, []);

  const saved = useMemo(() => joinSavedWithFood(records, allFoods), [records, allFoods]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const item of saved) {
      for (const category of item.food.categories) {
        const entry = counts.get(category.id);
        if (entry) entry.count += 1;
        else counts.set(category.id, { name: category.name, count: 1 });
      }
    }
    return counts;
  }, [saved]);

  const visibleSaved = useMemo(
    () => filterAndSortSaved(saved, { search, categoryId, sortOrder }),
    [saved, search, categoryId, sortOrder],
  );

  const stats = useMemo(
    () => computeSavedStats(saved, totalCategoriesAvailable),
    [saved, totalCategoriesAvailable],
  );

  /** Bỏ lưu thật — ghi vào localStorage qua savedFoodService. */
  const unsave = (foodId: string) => {
    removeSavedFood(foodId);
    setRecords((prev) => prev.filter((r) => r.foodId !== foodId));
  };

  const openModalWithFood = (food: Food) => {
    setModalFood(food);
    setIsModalOpen(true);
  };

  const openRandomModal = () => {
    const picked = pickRandomSavedFood(saved);
    if (picked) openModalWithFood(picked);
    if (readSoundPreference()) playRandomizeChime();
  };

  const rerollModal = () => {
    if (isRerolling) return;
    setIsRerolling(true);
    window.setTimeout(() => {
      setModalFood((current) => pickRandomSavedFood(saved, current?.id ?? null));
      setIsRerolling(false);
      if (readSoundPreference()) playRandomizeChime();
    }, MODAL_TRANSITION_MS);
  };

  /** Chốt ăn cũng ghi thật vào lịch sử, không chỉ hiện toast rồi biến mất. */
  const confirmModal = () => {
    if (!modalFood) return;
    addHistoryEntry({
      foodId: modalFood.id,
      timestamp: new Date().toISOString(),
      eatingLevel: modalFood.eatingLevels[0] ?? null,
      wasEaten: true,
      isSaved: true,
    });
    showToast(`Đã chốt ăn "${modalFood.name}" — đã ghi vào lịch sử!`, "success");
    setIsModalOpen(false);
  };

  const closeModal = () => setIsModalOpen(false);

  return {
    saved,
    visibleSaved,
    stats,
    categoryCounts,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    sortOrder,
    setSortOrder,
    unsave,
    modalFood,
    isModalOpen,
    isRerolling,
    openModalWithFood,
    openRandomModal,
    rerollModal,
    confirmModal,
    closeModal,
    isEmpty: saved.length === 0,
    hasNoFilterMatch: saved.length > 0 && visibleSaved.length === 0,
  };
}

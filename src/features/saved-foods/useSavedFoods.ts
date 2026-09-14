"use client";

import { useEffect, useMemo, useState } from "react";
import type { Food, FoodCategory } from "@/types/food";
import {
  computeSavedStats,
  filterAndSortSaved,
  joinSavedWithFood,
  pickRandomSavedFood,
  type SavedSortOrder,
} from "./savedFoodsLogic";
import type { SavedFoodRecord } from "@/data/savedFoods";
import { getSavedFoodRecords, removeSavedFood } from "@/services/savedFoodService";
import { addHistoryEntry } from "@/services/historyService";
import { readSoundPreference } from "@/features/settings/settingsLogic";
import { playRandomizeChime } from "@/lib/sound";

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
  const [category, setCategory] = useState<FoodCategory | "all">("all");
  const [sortOrder, setSortOrder] = useState<SavedSortOrder>("recent");

  const [modalFood, setModalFood] = useState<Food | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // SSR không đọc được localStorage — đồng bộ lại dữ liệu thật ngay sau khi mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(getSavedFoodRecords());
  }, []);

  const saved = useMemo(() => joinSavedWithFood(records, allFoods), [records, allFoods]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<FoodCategory, number>();
    for (const item of saved) {
      counts.set(item.food.category, (counts.get(item.food.category) ?? 0) + 1);
    }
    return counts;
  }, [saved]);

  const visibleSaved = useMemo(
    () => filterAndSortSaved(saved, { search, category, sortOrder }),
    [saved, search, category, sortOrder],
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
      hungerLevel: modalFood.hungerLevel,
      wasEaten: true,
      isSaved: true,
    });
    setToastMessage(`Đã chốt ăn "${modalFood.name}" — đã ghi vào lịch sử!`);
    setIsModalOpen(false);
    window.setTimeout(() => setToastMessage(null), 2800);
  };

  const closeModal = () => setIsModalOpen(false);

  return {
    saved,
    visibleSaved,
    stats,
    categoryCounts,
    search,
    setSearch,
    category,
    setCategory,
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
    toastMessage,
    isEmpty: saved.length === 0,
    hasNoFilterMatch: saved.length > 0 && visibleSaved.length === 0,
  };
}

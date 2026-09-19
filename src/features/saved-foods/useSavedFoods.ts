"use client";

import { useMemo, useState } from "react";
import type { Food } from "@/types/food";
import {
  computeSavedStats,
  filterAndSortSaved,
  joinSavedWithFood,
  pickRandomSavedFood,
  type SavedSortOrder,
} from "./savedFoodsLogic";
import { removeSavedFood, type SavedFoodRecord } from "@/services/savedFoodService";
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

  /** Bỏ lưu thật qua API — rollback nếu lỗi. */
  const unsave = async (foodId: string) => {
    const snapshot = records;
    setRecords((prev) => prev.filter((r) => r.foodId !== foodId));
    const ok = await removeSavedFood(foodId);
    if (!ok) {
      setRecords(snapshot);
      showToast("Không thể bỏ lưu món này, vui lòng thử lại.", "error");
    }
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

  /** Chốt ăn cũng ghi thật vào lịch sử qua API, không chỉ hiện toast rồi biến mất. */
  const confirmModal = async () => {
    if (!modalFood) return;
    if (!modalFood.restaurant) {
      showToast("Món này chưa gắn quán, không thể ghi nhận lịch sử.", "error");
      return;
    }
    const ok = await addHistoryEntry({ foodId: modalFood.id, restaurantId: modalFood.restaurant.id });
    showToast(
      ok ? `Đã chốt ăn "${modalFood.name}" — đã ghi vào lịch sử!` : "Không thể ghi nhận lịch sử, vui lòng thử lại.",
      ok ? "success" : "error",
    );
    if (ok) setIsModalOpen(false);
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

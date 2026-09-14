"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Food, HungerLevel } from "@/types/food";
import { filterFoods, pickAlternatives, pickRandomFood, type RandomFilters } from "./randomLogic";
import { readSoundPreference } from "@/features/settings/settingsLogic";
import { playRandomizeChime } from "@/lib/sound";
import { addHistoryEntry } from "@/services/historyService";
import { addSavedFood, getSavedFoodRecords, removeSavedFood } from "@/services/savedFoodService";

/** Thời gian hiệu ứng "xóc đĩa" trước khi hiện kết quả mới, tính bằng ms. */
const RANDOMIZE_DURATION_MS = 700;
/** Thời gian toast tự ẩn. */
const TOAST_DURATION_MS = 2800;
const ALTERNATIVES_COUNT = 3;

interface UseRandomFoodOptions {
  allFoods: Food[];
  initialHungerLevel: HungerLevel | null;
  /** Món + phương án dự phòng được random SẴN trên server, tránh gọi Math.random()
   * lại lúc client hydrate (2 lần random độc lập trên server/client sẽ ra kết quả
   * khác nhau và gây hydration mismatch). */
  initialFood: Food | null;
  initialAlternatives: Food[];
}

export function useRandomFood({
  allFoods,
  initialHungerLevel,
  initialFood,
  initialAlternatives,
}: UseRandomFoodOptions) {
  const [hungerLevel] = useState<HungerLevel | null>(initialHungerLevel);
  const [noSpice, setNoSpice] = useState(false);
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [under50k, setUnder50k] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentFood, setCurrentFood] = useState<Food | null>(initialFood);
  const [alternatives, setAlternatives] = useState<Food[]>(initialAlternatives);

  useEffect(() => {
    // SSR không đọc được localStorage — nạp danh sách đã lưu thật sau khi mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds(new Set(getSavedFoodRecords().map((record) => record.foodId)));
  }, []);

  const filters: RandomFilters = useMemo(
    () => ({ hungerLevel, noSpice, vegetarianOnly, under50k }),
    [hungerLevel, noSpice, vegetarianOnly, under50k],
  );

  const pool = useMemo(() => filterFoods(allFoods, filters), [allFoods, filters]);

  const isFirstAlternativesRun = useRef(true);
  useEffect(() => {
    // Bỏ qua lần chạy đầu (mount) để giữ đúng alternatives đã random sẵn từ server —
    // chỉ random lại khi đổi bộ lọc hoặc đổi món (currentFood) sau đó, lúc này chắc
    // chắn đã qua hydrate nên không còn rủi ro lệch server/client.
    if (isFirstAlternativesRun.current) {
      isFirstAlternativesRun.current = false;
      return;
    }
    setAlternatives(currentFood ? pickAlternatives(pool, currentFood.id, ALTERNATIVES_COUNT) : []);
  }, [pool, currentFood]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const runWithTransition = useCallback((getNextFood: () => Food | null) => {
    setIsRandomizing(true);
    window.setTimeout(() => {
      setCurrentFood(getNextFood());
      setIsRandomizing(false);
      if (readSoundPreference()) playRandomizeChime();
    }, RANDOMIZE_DURATION_MS);
  }, []);

  const randomize = useCallback(() => {
    if (isRandomizing) return;
    runWithTransition(() => pickRandomFood(pool, currentFood?.id ?? null));
  }, [isRandomizing, pool, currentFood, runWithTransition]);

  const selectFood = useCallback(
    (food: Food) => {
      if (isRandomizing) return;
      runWithTransition(() => food);
    },
    [isRandomizing, runWithTransition],
  );

  /** Lưu/bỏ lưu thật — ghi vào localStorage qua savedFoodService, hiện trong /da-luu ngay. */
  const toggleSaved = useCallback(() => {
    if (!currentFood) return;
    const foodId = currentFood.id;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) {
        next.delete(foodId);
        removeSavedFood(foodId);
        setToastMessage("Đã bỏ lưu món ăn.");
      } else {
        next.add(foodId);
        addSavedFood(foodId);
        setToastMessage("Đã lưu món vào danh sách yêu thích!");
      }
      return next;
    });
  }, [currentFood]);

  /** Ghi nhận thật vào lịch sử — ghi vào localStorage qua historyService, hiện trong /lich-su ngay. */
  const markEaten = useCallback(() => {
    if (!currentFood) return;
    addHistoryEntry({
      foodId: currentFood.id,
      timestamp: new Date().toISOString(),
      hungerLevel: currentFood.hungerLevel,
      wasEaten: true,
      isSaved: savedIds.has(currentFood.id),
    });
    setToastMessage("Đã ghi nhận bữa ăn vào lịch sử!");
  }, [currentFood, savedIds]);

  const share = useCallback(() => {
    if (!currentFood) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => setToastMessage("Đã sao chép liên kết gợi ý món ăn!"))
        .catch(() => setToastMessage("Không thể sao chép liên kết."));
    }
  }, [currentFood]);

  return {
    hungerLevel,
    currentFood,
    alternatives,
    isRandomizing,
    poolSize: pool.length,
    isSaved: currentFood ? savedIds.has(currentFood.id) : false,
    noSpice,
    setNoSpice,
    vegetarianOnly,
    setVegetarianOnly,
    under50k,
    setUnder50k,
    randomize,
    selectFood,
    toggleSaved,
    markEaten,
    share,
    toastMessage,
    dismissToast: () => setToastMessage(null),
  };
}

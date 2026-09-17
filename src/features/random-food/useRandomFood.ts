"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { EatingLevel, Food } from "@/types/food";
import { filterFoods, pickAlternatives, pickRandomFood, type RandomFilters } from "./randomLogic";
import { readSoundPreference } from "@/features/settings/settingsLogic";
import { playRandomizeChime } from "@/lib/sound";
import { addHistoryEntry } from "@/services/historyService";
import { addSavedFood, getSavedFoodRecords, removeSavedFood } from "@/services/savedFoodService";
import { useToast } from "@/components/ui/ToastProvider";

/** Thời gian hiệu ứng "xóc đĩa" trước khi hiện kết quả mới, tính bằng ms. */
const RANDOMIZE_DURATION_MS = 700;
const ALTERNATIVES_COUNT = 3;

interface UseRandomFoodOptions {
  allFoods: Food[];
  initialEatingLevel: EatingLevel | null;
  initialCategoryId: string | null;
  /** Món + phương án dự phòng được random SẴN trên server, tránh gọi Math.random()
   * lại lúc client hydrate (2 lần random độc lập trên server/client sẽ ra kết quả
   * khác nhau và gây hydration mismatch). */
  initialFood: Food | null;
  initialAlternatives: Food[];
}

export function useRandomFood({
  allFoods,
  initialEatingLevel,
  initialCategoryId,
  initialFood,
  initialAlternatives,
}: UseRandomFoodOptions) {
  const [eatingLevel] = useState<EatingLevel | null>(initialEatingLevel);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialCategoryId ? [initialCategoryId] : [],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentFood, setCurrentFood] = useState<Food | null>(initialFood);
  const [alternatives, setAlternatives] = useState<Food[]>(initialAlternatives);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const { data: session, status } = useSession();
  // Kiểm tra thêm session.user vì server có thể đã gỡ session.user (idle-timeout/thu
  // hồi phiên — xem callbacks.session() trong lib/auth.ts) trong lúc status vẫn còn
  // báo "authenticated" cho tới khi SessionErrorGuard kịp đăng xuất hẳn.
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const { showToast } = useToast();

  useEffect(() => {
    // SSR không đọc được localStorage — nạp danh sách đã lưu thật sau khi mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds(new Set(getSavedFoodRecords().map((record) => record.foodId)));
  }, []);

  const filters: RandomFilters = useMemo(
    () => ({ eatingLevel, categoryIds: selectedCategoryIds, tags: selectedTags }),
    [eatingLevel, selectedCategoryIds, selectedTags],
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

  const toggleCategory = useCallback((value: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }, []);

  const toggleTag = useCallback((value: string) => {
    setSelectedTags((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }, []);

  /** "Random hoàn toàn": xoá hết filter đang chọn rồi random lại trên toàn bộ pool theo eatingLevel. */
  const randomizeAll = useCallback(() => {
    if (isRandomizing) return;
    setSelectedCategoryIds([]);
    setSelectedTags([]);
    const fullPool = filterFoods(allFoods, { eatingLevel, categoryIds: [], tags: [] });
    runWithTransition(() => pickRandomFood(fullPool, currentFood?.id ?? null));
  }, [isRandomizing, allFoods, eatingLevel, currentFood, runWithTransition]);

  const selectFood = useCallback(
    (food: Food) => {
      if (isRandomizing) return;
      runWithTransition(() => food);
    },
    [isRandomizing, runWithTransition],
  );

  /**
   * Lưu/bỏ lưu — theo BR-U01/U02 (guest không lưu trữ), guest bấm tim sẽ thấy
   * modal đăng nhập thay vì lưu ẩn danh. Đã đăng nhập thì vẫn dùng cơ chế lưu
   * local hiện có (chưa nối collection `favorites` thật — xem ghi chú ở
   * src/app/api/favorites/route.ts).
   */
  const toggleSaved = useCallback(() => {
    if (!currentFood) return;
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    const foodId = currentFood.id;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) {
        next.delete(foodId);
        removeSavedFood(foodId);
        showToast("Đã bỏ lưu món ăn.", "info");
      } else {
        next.add(foodId);
        addSavedFood(foodId);
        showToast("Đã lưu món vào danh sách yêu thích!", "success");
      }
      return next;
    });
  }, [currentFood, isAuthenticated, showToast]);

  /** Ghi nhận thật vào lịch sử — ghi vào localStorage qua historyService, hiện trong /lich-su ngay. */
  const markEaten = useCallback(() => {
    if (!currentFood) return;
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    addHistoryEntry({
      foodId: currentFood.id,
      timestamp: new Date().toISOString(),
      eatingLevel: currentFood.eatingLevels[0] ?? null,
      wasEaten: true,
      isSaved: savedIds.has(currentFood.id),
    });
    showToast("Đã ghi nhận bữa ăn vào lịch sử!", "success");
  }, [currentFood, savedIds, isAuthenticated, showToast]);

  const share = useCallback(() => {
    if (!currentFood) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => showToast("Đã sao chép liên kết gợi ý món ăn!", "success"))
        .catch(() => showToast("Không thể sao chép liên kết.", "error"));
    }
  }, [currentFood, showToast]);

  return {
    eatingLevel,
    currentFood,
    alternatives,
    isRandomizing,
    poolSize: pool.length,
    isSaved: currentFood ? savedIds.has(currentFood.id) : false,
    isLoginGateOpen,
    closeLoginGate: () => setIsLoginGateOpen(false),
    selectedCategoryIds,
    selectedTags,
    toggleCategory,
    toggleTag,
    randomize,
    randomizeAll,
    selectFood,
    toggleSaved,
    markEaten,
    share,
  };
}

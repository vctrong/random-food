"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { EatingLevel, Food } from "@/types/food";
import {
  applyPersonalPreferences,
  filterFoods,
  pickRandomFood,
  pickRelatedFoods,
  type PersonalPreferences,
  type RandomFilters,
} from "./randomLogic";
import { readSoundPreference } from "@/features/settings/settingsLogic";
import { playRandomizeChime } from "@/lib/sound";
import { addHistoryEntry } from "@/services/historyService";
import { addSavedFood, getSavedFoodRecords, removeSavedFood } from "@/services/savedFoodService";
import { trackRandomEvent } from "@/services/logService";
import { getPersonalPreferences, getRecentFoodIds } from "@/services/preferencesService";
import { useToast } from "@/components/ui/ToastProvider";

/** Thời gian hiệu ứng "xóc đĩa" trước khi hiện kết quả mới, tính bằng ms. */
const RANDOMIZE_DURATION_MS = 700;

interface UseRandomFoodOptions {
  allFoods: Food[];
  initialEatingLevel: EatingLevel | null;
  initialCategoryId: string | null;
  /** Món random SẴN trên server, tránh gọi Math.random() lại lúc client hydrate
   * (2 lần random độc lập trên server/client sẽ ra kết quả khác nhau và gây
   * hydration mismatch). */
  initialFood: Food | null;
}

export function useRandomFood({
  allFoods,
  initialEatingLevel,
  initialCategoryId,
  initialFood,
}: UseRandomFoodOptions) {
  const [eatingLevel] = useState<EatingLevel | null>(initialEatingLevel);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialCategoryId ? [initialCategoryId] : [],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentFood, setCurrentFood] = useState<Food | null>(initialFood);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(false);
  const { data: session, status } = useSession();
  // Kiểm tra thêm session.user vì server có thể đã gỡ session.user (idle-timeout/thu
  // hồi phiên — xem callbacks.session() trong lib/auth.ts) trong lúc status vẫn còn
  // báo "authenticated" cho tới khi SessionErrorGuard kịp đăng xuất hẳn.
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const { showToast } = useToast();
  const [personalPreferences, setPersonalPreferences] = useState<PersonalPreferences | null>(null);
  const [recentFoodIds, setRecentFoodIds] = useState<string[]>([]);

  useEffect(() => {
    // Trang random không có SSR initial favorites — nạp danh sách đã lưu thật
    // (từ DB qua API) sau khi mount, chỉ khi đã đăng nhập (guest luôn rỗng).
    if (!isAuthenticated) return;
    let cancelled = false;
    getSavedFoodRecords().then((records) => {
      if (!cancelled) setSavedIds(new Set(records.map((record) => record.foodId)));
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Sở thích ăn uống (Hồ sơ) + lịch sử 24h gần nhất — chỉ user đã đăng nhập mới
    // có (Guest không lưu trữ). Nạp sau mount nên kết quả SSR ban đầu (initialFood)
    // chưa áp được sở thích; từ lần random tiếp theo trở đi mới áp đầy đủ.
    if (!isAuthenticated) {
      // Đồng bộ về rỗng khi user đăng xuất ngay tại trang random (không phải lần
      // mount đầu — state đã khởi tạo null/[] sẵn) — không có side effect bất
      // đồng bộ nào theo sau nên không gây cascading render như hiệu ứng fetch bên dưới.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonalPreferences(null);
      setRecentFoodIds([]);
      return;
    }
    let cancelled = false;
    Promise.all([getPersonalPreferences(), getRecentFoodIds()]).then(([prefs, recent]) => {
      if (cancelled) return;
      setPersonalPreferences(prefs);
      setRecentFoodIds(recent);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const filters: RandomFilters = useMemo(
    () => ({ eatingLevel, categoryIds: selectedCategoryIds, tags: selectedTags }),
    [eatingLevel, selectedCategoryIds, selectedTags],
  );

  const pool = useMemo(() => {
    const base = filterFoods(allFoods, filters);
    return personalPreferences ? applyPersonalPreferences(base, personalPreferences, recentFoodIds) : base;
  }, [allFoods, filters, personalPreferences, recentFoodIds]);

  // Món liên quan (cùng quán, fallback cùng danh mục) — hàm THUẦN/tất định nên
  // tính trực tiếp bằng useMemo, không cần effect hay giá trị initial từ server
  // như "phương án dự phòng" random cũ (đã bỏ, xem randomLogic.ts).
  const relatedFoods = useMemo(
    () => (currentFood ? pickRelatedFoods(allFoods, currentFood) : { reason: "none" as const, foods: [] }),
    [allFoods, currentFood],
  );

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
    trackRandomEvent();
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
    trackRandomEvent();
    setSelectedCategoryIds([]);
    setSelectedTags([]);
    const base = filterFoods(allFoods, { eatingLevel, categoryIds: [], tags: [] });
    const fullPool = personalPreferences
      ? applyPersonalPreferences(base, personalPreferences, recentFoodIds)
      : base;
    runWithTransition(() => pickRandomFood(fullPool, currentFood?.id ?? null));
  }, [isRandomizing, allFoods, eatingLevel, currentFood, runWithTransition, personalPreferences, recentFoodIds]);

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
  const toggleSaved = useCallback(async () => {
    if (!currentFood) return;
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    const foodId = currentFood.id;
    const wasSaved = savedIds.has(foodId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(foodId);
      else next.add(foodId);
      return next;
    });
    const ok = wasSaved ? await removeSavedFood(foodId) : await addSavedFood(foodId);
    if (!ok) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(foodId);
        else next.delete(foodId);
        return next;
      });
      showToast("Không thể cập nhật món đã lưu, vui lòng thử lại.", "error");
      return;
    }
    showToast(wasSaved ? "Đã bỏ lưu món ăn." : "Đã lưu món vào danh sách yêu thích!", wasSaved ? "info" : "success");
  }, [currentFood, isAuthenticated, savedIds, showToast]);

  /** Ghi nhận thật vào lịch sử qua API — hiện trong /lich-su ngay. */
  const markEaten = useCallback(async () => {
    if (!currentFood) return;
    if (!isAuthenticated) {
      setIsLoginGateOpen(true);
      return;
    }
    if (!currentFood.restaurant) {
      showToast("Món này chưa gắn quán, không thể ghi nhận lịch sử.", "error");
      return;
    }
    const ok = await addHistoryEntry({ foodId: currentFood.id, restaurantId: currentFood.restaurant.id });
    showToast(
      ok ? "Đã ghi nhận bữa ăn vào lịch sử!" : "Không thể ghi nhận vào lịch sử, vui lòng thử lại.",
      ok ? "success" : "error",
    );
  }, [currentFood, isAuthenticated, showToast]);

  /**
   * Chia sẻ link CHI TIẾT món (/mon-an/[id]) — trước đây copy thẳng URL trang
   * /random hiện tại, người nhận link mở ra sẽ bị random ra món KHÁC chứ không
   * phải món đang xem, sai mục đích chia sẻ.
   */
  const share = useCallback(() => {
    if (!currentFood) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const detailUrl = `${window.location.origin}/mon-an/${currentFood.id}`;
      navigator.clipboard
        .writeText(detailUrl)
        .then(() => showToast("Đã sao chép liên kết món ăn!", "success"))
        .catch(() => showToast("Không thể sao chép liên kết.", "error"));
    }
  }, [currentFood, showToast]);

  return {
    eatingLevel,
    currentFood,
    relatedFoods,
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

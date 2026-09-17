"use client";

import { useEffect, useState } from "react";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "./settingsLogic";
import { useToast } from "@/components/ui/ToastProvider";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Đồng bộ 1 lần từ localStorage sau khi mount — không thể đọc lúc SSR nên
    // buộc phải setState trong effect để tránh lệch hydration.
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      // localStorage không khả dụng (vd: chế độ riêng tư) — dùng mặc định.
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Bỏ qua nếu không ghi được.
    }
  }, [settings, isHydrated]);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function addFavorite(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings((prev) =>
      prev.favoriteFoodNames.includes(trimmed)
        ? prev
        : { ...prev, favoriteFoodNames: [...prev.favoriteFoodNames, trimmed] },
    );
    showToast(`Đã thêm "${trimmed}" vào món yêu thích!`, "success");
  }

  function removeFavorite(name: string) {
    setSettings((prev) => ({
      ...prev,
      favoriteFoodNames: prev.favoriteFoodNames.filter((n) => n !== name),
    }));
  }

  function addDisliked(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings((prev) =>
      prev.dislikedIngredients.includes(trimmed)
        ? prev
        : { ...prev, dislikedIngredients: [...prev.dislikedIngredients, trimmed] },
    );
    showToast(`Đã thêm "${trimmed}" vào danh sách dị ứng!`, "success");
  }

  function removeDisliked(name: string) {
    setSettings((prev) => ({
      ...prev,
      dislikedIngredients: prev.dislikedIngredients.filter((n) => n !== name),
    }));
  }

  function toggleVegetarian() {
    setSettings((prev) => {
      const next = !prev.vegetarianMode;
      showToast(next ? "Đã bật chế độ ăn chay!" : "Đã tắt chế độ ăn chay", "info");
      return { ...prev, vegetarianMode: next };
    });
  }

  function toggleAllowRepeat() {
    update("allowRepeatWithin24h", !settings.allowRepeatWithin24h);
  }

  function toggleSound() {
    setSettings((prev) => {
      const next = !prev.soundEffectsEnabled;
      showToast(next ? "Đã bật âm thanh hiệu ứng" : "Đã tắt âm thanh", "info");
      return { ...prev, soundEffectsEnabled: next };
    });
  }

  function resetAll() {
    setSettings(DEFAULT_SETTINGS);
    showToast("Đã đặt lại toàn bộ cài đặt về mặc định!", "info");
  }

  function notify(message: string) {
    showToast(message);
  }

  return {
    settings,
    update,
    addFavorite,
    removeFavorite,
    addDisliked,
    removeDisliked,
    toggleVegetarian,
    toggleAllowRepeat,
    toggleSound,
    resetAll,
    notify,
  };
}

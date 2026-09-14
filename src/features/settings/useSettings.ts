"use client";

import { useEffect, useState } from "react";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "./settingsLogic";

const TOAST_DURATION_MS = 2600;

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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
    setToastMessage(`Đã thêm "${trimmed}" vào món yêu thích!`);
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
    setToastMessage(`Đã thêm "${trimmed}" vào danh sách dị ứng!`);
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
      setToastMessage(next ? "Đã bật chế độ ăn chay!" : "Đã tắt chế độ ăn chay");
      return { ...prev, vegetarianMode: next };
    });
  }

  function toggleAllowRepeat() {
    update("allowRepeatWithin24h", !settings.allowRepeatWithin24h);
  }

  function toggleSound() {
    setSettings((prev) => {
      const next = !prev.soundEffectsEnabled;
      setToastMessage(next ? "Đã bật âm thanh hiệu ứng" : "Đã tắt âm thanh");
      return { ...prev, soundEffectsEnabled: next };
    });
  }

  function resetAll() {
    setSettings(DEFAULT_SETTINGS);
    setToastMessage("Đã đặt lại toàn bộ cài đặt về mặc định!");
  }

  function notify(message: string) {
    setToastMessage(message);
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
    toastMessage,
  };
}

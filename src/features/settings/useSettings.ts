"use client";

import { useEffect, useState } from "react";
import type { UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "./settingsLogic";
import { useToast } from "@/components/ui/ToastProvider";

/** Cài đặt giao diện thuần client (âm thanh, giảm chuyển động) — Guest cũng dùng được. */
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
    // Toggle "giảm chuyển động" áp dụng ngay lập tức toàn app qua class trên <html> —
    // globals.css có rule y hệt @media (prefers-reduced-motion: reduce) nhưng khớp
    // thêm class ".reduce-motion" để ép được dù OS không báo prefers-reduced-motion.
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotionOverride);
  }, [settings, isHydrated]);

  function toggleSound() {
    // showToast gọi setState của ToastProvider — KHÔNG được gọi bên trong updater
    // function của setSettings (updater phải thuần, React có thể gọi lại nó bất kỳ
    // lúc nào kể cả trong lúc render, gây lỗi "Cannot update a component while
    // rendering a different component"). Tính next trước, showToast ở ngoài, rồi
    // mới setSettings với giá trị thuần.
    const next = !settings.soundEffectsEnabled;
    showToast(next ? "Đã bật âm thanh hiệu ứng" : "Đã tắt âm thanh", "info");
    setSettings((prev) => ({ ...prev, soundEffectsEnabled: next }));
  }

  function toggleReducedMotion() {
    const next = !settings.reducedMotionOverride;
    showToast(next ? "Đã giảm chuyển động trong app" : "Đã bật lại hiệu ứng chuyển động", "info");
    setSettings((prev) => ({ ...prev, reducedMotionOverride: next }));
  }

  function resetAll() {
    setSettings(DEFAULT_SETTINGS);
    showToast("Đã đặt lại cài đặt giao diện về mặc định!", "info");
  }

  function notify(message: string) {
    showToast(message);
  }

  return { settings, toggleSound, toggleReducedMotion, resetAll, notify };
}

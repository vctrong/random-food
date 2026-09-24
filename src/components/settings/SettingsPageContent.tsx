"use client";

import { useState } from "react";
import { Bell, Contrast, Database, Info, Settings2, ShieldAlert } from "lucide-react";
import type { Food } from "@/types/food";
import { joinHistoryWithFood } from "@/features/history-log/historyLogic";
import { joinSavedWithFood } from "@/features/saved-foods/savedFoodsLogic";
import { getAllHistory } from "@/services/historyService";
import { getSavedFoodRecords } from "@/services/savedFoodService";
import { useSettings } from "@/features/settings/useSettings";
import {
  buildHistoryExportCsv,
  buildHistoryExportJson,
  buildSavedBackupJson,
  computeSettingsSize,
  downloadTextFile,
} from "@/features/settings/settingsLogic";
import { useToast } from "@/components/ui/ToastProvider";
import { SectionSidebar, type SectionNavItem } from "@/components/ui/SectionSidebar";
import { NotificationsSection } from "./NotificationsSection";
import { DataStorageSection } from "./DataStorageSection";
import { InterfaceSection } from "./InterfaceSection";
import { AboutSection } from "./AboutSection";
import { PrivacySection } from "./PrivacySection";
import { LoginPromptInline } from "./LoginPromptInline";

interface SettingsPageContentProps {
  allFoods: Food[];
  totalFoodsCount: number;
  appVersion: string;
  isAuthenticated: boolean;
  notificationPrefs: Record<string, boolean> | null;
  hasAppliedReviewer: boolean;
}

const NAV_ITEMS: SectionNavItem[] = [
  { id: "giao-dien", label: "Giao diện & Âm thanh", icon: Contrast },
  { id: "thong-bao", label: "Thông báo", icon: Bell },
  { id: "du-lieu", label: "Quản lý dữ liệu", icon: Database },
  { id: "quyen-rieng-tu", label: "Quyền riêng tư", icon: ShieldAlert },
  { id: "ve-app", label: "Về Nay Ăn Gì?", icon: Info },
];

export function SettingsPageContent({
  allFoods,
  totalFoodsCount,
  appVersion,
  isAuthenticated,
  notificationPrefs,
  hasAppliedReviewer,
}: SettingsPageContentProps) {
  const { settings, toggleSound, toggleReducedMotion, resetAll, notify } = useSettings();
  const { showToast } = useToast();
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  async function handleNotificationPrefsChange(next: Record<string, boolean>) {
    setIsSavingNotifications(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: next }),
      });
      if (!response.ok) showToast("Không thể lưu tuỳ chọn thông báo, vui lòng thử lại.", "error");
    } catch {
      showToast("Không thể kết nối tới máy chủ.", "error");
    } finally {
      setIsSavingNotifications(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Settings2 className="size-4" aria-hidden />
          <span>Cài đặt chung</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Cài đặt</h1>
        <p className="text-text-secondary mt-1">
          Giao diện, âm thanh và các tuỳ chọn chung — dùng được cả khi chưa đăng nhập.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SectionSidebar items={NAV_ITEMS} />

        <div className="lg:col-span-9 space-y-6">
          <InterfaceSection
            soundEnabled={settings.soundEffectsEnabled}
            onToggleSound={toggleSound}
            reducedMotionEnabled={settings.reducedMotionOverride}
            onToggleReducedMotion={toggleReducedMotion}
          />

          {isAuthenticated && notificationPrefs ? (
            <div className="relative">
              {isSavingNotifications && (
                <span className="absolute top-4 right-4 text-xs text-text-secondary">Đang lưu…</span>
              )}
              <NotificationsSection
                initialPrefs={notificationPrefs}
                hasAppliedReviewer={hasAppliedReviewer}
                onChange={handleNotificationPrefsChange}
              />
            </div>
          ) : (
            <div id="thong-bao">
              <LoginPromptInline
                icon={Bell}
                title="Đăng nhập để quản lý thông báo"
                description="Chọn loại thông báo bạn muốn nhận về đóng góp, ứng tuyển FoodReviewer và bảo mật tài khoản."
              />
            </div>
          )}

          <DataStorageSection
            storageSize={computeSettingsSize(settings)}
            isAuthenticated={isAuthenticated}
            onExportHistoryJson={async () => {
              const historyEntries = joinHistoryWithFood(await getAllHistory(allFoods), allFoods);
              downloadTextFile(
                "nayangi-lich-su.json",
                buildHistoryExportJson(historyEntries),
                "application/json",
              );
              notify("Đã tải file JSON lịch sử!");
            }}
            onExportHistoryCsv={async () => {
              const historyEntries = joinHistoryWithFood(await getAllHistory(allFoods), allFoods);
              downloadTextFile(
                "nayangi-lich-su.csv",
                buildHistoryExportCsv(historyEntries),
                "text/csv;charset=utf-8",
              );
              notify("Đã tải file CSV lịch sử!");
            }}
            onBackupSaved={async () => {
              const savedFoods = joinSavedWithFood(await getSavedFoodRecords(), allFoods);
              downloadTextFile(
                "nayangi-mon-da-luu.json",
                buildSavedBackupJson(savedFoods),
                "application/json",
              );
              notify("Đã tạo bản sao lưu món đã lưu!");
            }}
            onResetAll={resetAll}
          />

          <PrivacySection />

          <AboutSection version={appVersion} totalFoodsCount={totalFoodsCount} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { SlidersHorizontal } from "lucide-react";
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
import { Toast } from "@/components/ui/Toast";
import { PreferencesSection } from "./PreferencesSection";
import { DataStorageSection } from "./DataStorageSection";
import { InterfaceSection } from "./InterfaceSection";
import { AboutSection } from "./AboutSection";
import { SettingsNav } from "./SettingsNav";

interface SettingsPageContentProps {
  allFoods: Food[];
  totalFoodsCount: number;
  appVersion: string;
}

export function SettingsPageContent({
  allFoods,
  totalFoodsCount,
  appVersion,
}: SettingsPageContentProps) {
  const {
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
  } = useSettings();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>Tuỳ chỉnh trải nghiệm ăn uống</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Cài đặt & Giới thiệu
          </h1>
          <p className="text-text-secondary mt-1">
            Cấu hình khẩu vị cá nhân và quản lý dữ liệu lưu trên thiết bị này.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm self-start md:self-auto">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <span className="text-sm text-text-primary">
            Khẩu vị: <span className="text-primary-blue font-bold">Đã lưu tự động</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SettingsNav />

        <div className="lg:col-span-9 space-y-6">
          <PreferencesSection
            settings={settings}
            onAddFavorite={addFavorite}
            onRemoveFavorite={removeFavorite}
            onAddDisliked={addDisliked}
            onRemoveDisliked={removeDisliked}
            onChangePriceRange={(value) => update("priceRange", value)}
            onChangeSpice={(value) => update("spicePreference", value)}
            onToggleVegetarian={toggleVegetarian}
            onToggleAllowRepeat={toggleAllowRepeat}
          />

          <DataStorageSection
            storageSize={computeSettingsSize(settings)}
            onExportHistoryJson={() => {
              const historyEntries = joinHistoryWithFood(getAllHistory(), allFoods);
              downloadTextFile(
                "hom-nay-an-gi-lich-su.json",
                buildHistoryExportJson(historyEntries),
                "application/json",
              );
              notify("Đã tải file JSON lịch sử!");
            }}
            onExportHistoryCsv={() => {
              const historyEntries = joinHistoryWithFood(getAllHistory(), allFoods);
              downloadTextFile(
                "hom-nay-an-gi-lich-su.csv",
                buildHistoryExportCsv(historyEntries),
                "text/csv;charset=utf-8",
              );
              notify("Đã tải file CSV lịch sử!");
            }}
            onBackupSaved={() => {
              const savedFoods = joinSavedWithFood(getSavedFoodRecords(), allFoods);
              downloadTextFile(
                "hom-nay-an-gi-mon-da-luu.json",
                buildSavedBackupJson(savedFoods),
                "application/json",
              );
              notify("Đã tạo bản sao lưu món đã lưu!");
            }}
            onResetAll={resetAll}
          />

          <InterfaceSection soundEnabled={settings.soundEffectsEnabled} onToggleSound={toggleSound} />

          <AboutSection version={appVersion} totalFoodsCount={totalFoodsCount} />
        </div>
      </div>

      <Toast message={toastMessage} />
    </div>
  );
}

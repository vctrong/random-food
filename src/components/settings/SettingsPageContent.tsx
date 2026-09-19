"use client";

import { useState } from "react";
import { SlidersHorizontal, UserCog } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { PreferencesSection } from "./PreferencesSection";
import { DataStorageSection } from "./DataStorageSection";
import { InterfaceSection } from "./InterfaceSection";
import { AboutSection } from "./AboutSection";
import { SettingsNav } from "./SettingsNav";
import { AccountSection } from "./AccountSection";

interface SettingsPageContentProps {
  allFoods: Food[];
  totalFoodsCount: number;
  appVersion: string;
  isAuthenticated: boolean;
  account: {
    email: string;
    authProvider: "local" | "google";
    notificationPrefs: Record<string, boolean>;
  } | null;
}

type SettingsTab = "account" | "random";

export function SettingsPageContent({
  allFoods,
  totalFoodsCount,
  appVersion,
  isAuthenticated,
  account,
}: SettingsPageContentProps) {
  const [tab, setTab] = useState<SettingsTab>(isAuthenticated ? "account" : "random");

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
  } = useSettings();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>Tài khoản & trải nghiệm ăn uống</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Cài đặt
          </h1>
          <p className="text-text-secondary mt-1">
            Quản lý tài khoản và tuỳ chọn cho thuật toán random món ăn.
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-border mb-8">
        <button
          type="button"
          onClick={() => setTab("account")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            tab === "account"
              ? "bg-soft-blue text-primary-blue font-bold"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <UserCog className="size-4" aria-hidden />
          Tài khoản
        </button>
        <button
          type="button"
          onClick={() => setTab("random")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            tab === "random"
              ? "bg-soft-blue text-primary-blue font-bold"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Tuỳ chọn Random
        </button>
      </div>

      {tab === "account" ? (
        isAuthenticated && account ? (
          <div className="max-w-2xl">
            <AccountSection
              email={account.email}
              authProvider={account.authProvider}
              initialNotificationPrefs={account.notificationPrefs}
            />
          </div>
        ) : (
          <div className="max-w-lg mx-auto text-center bg-white rounded-2xl p-10 shadow-sm">
            <p className="text-text-secondary">
              Đăng nhập để quản lý thông tin tài khoản, đổi mật khẩu và thông báo.
            </p>
          </div>
        )
      ) : (
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
              onExportHistoryJson={async () => {
                const historyEntries = joinHistoryWithFood(await getAllHistory(allFoods), allFoods);
                downloadTextFile(
                  "hom-nay-an-gi-lich-su.json",
                  buildHistoryExportJson(historyEntries),
                  "application/json",
                );
                notify("Đã tải file JSON lịch sử!");
              }}
              onExportHistoryCsv={async () => {
                const historyEntries = joinHistoryWithFood(await getAllHistory(allFoods), allFoods);
                downloadTextFile(
                  "hom-nay-an-gi-lich-su.csv",
                  buildHistoryExportCsv(historyEntries),
                  "text/csv;charset=utf-8",
                );
                notify("Đã tải file CSV lịch sử!");
              }}
              onBackupSaved={async () => {
                const savedFoods = joinSavedWithFood(await getSavedFoodRecords(), allFoods);
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
      )}
    </div>
  );
}

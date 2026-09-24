"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { AlertTriangle, Camera, Check, Leaf, History, Loader2 } from "lucide-react";
import { PRICE_RANGE_OPTIONS, SPICE_OPTIONS } from "@/features/settings/settingsLogic";
import type { PriceRangePreference, SpicePreference } from "@/types/settings";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { useUnsavedChangesWarning } from "@/features/settings/useUnsavedChangesWarning";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";

interface CategoryOption {
  id: string;
  name: string;
}

/** min/max theo đúng 5 preset cũ — dùng để suy ra preset nào đang active từ {min,max} lưu trong DB, và ngược lại. */
const PRICE_RANGE_VALUES: Record<PriceRangePreference, { min: number; max?: number } | null> = {
  "duoi-30k": { min: 0, max: 30000 },
  "30-60k": { min: 30000, max: 60000 },
  "60-120k": { min: 60000, max: 120000 },
  "tren-120k": { min: 120000 },
  "tat-ca": null,
};

function findPricePreset(value: { min: number; max?: number } | null): PriceRangePreference {
  const id = (Object.keys(PRICE_RANGE_VALUES) as PriceRangePreference[]).find((key) => {
    const preset = PRICE_RANGE_VALUES[key];
    if (preset === null) return value === null;
    return value !== null && value.min === preset.min && value.max === preset.max;
  });
  return id ?? "30-60k";
}

const ROLE_LABELS: Record<string, string> = {
  user: "Người dùng",
  foodreviewer: "FoodReviewer",
  admin: "Quản trị viên",
};

interface ProfileFormProps {
  email: string;
  role: string;
  joinedAtLabel: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialPriceRange: { min: number; max?: number } | null;
  initialFavoriteCategoryIds: string[];
  categories: CategoryOption[];
  initialFavoriteFoodNames: string[];
  initialDislikedIngredients: string[];
  initialSpicePreference: SpicePreference | null;
  initialVegetarianMode: boolean;
  initialAllowRepeatWithin24h: boolean;
}

export function ProfileForm({
  email,
  role,
  joinedAtLabel,
  initialDisplayName,
  initialAvatarUrl,
  initialPriceRange,
  initialFavoriteCategoryIds,
  categories,
  initialFavoriteFoodNames,
  initialDislikedIngredients,
  initialSpicePreference,
  initialVegetarianMode,
  initialAllowRepeatWithin24h,
}: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [priceRangePreset, setPriceRangePreset] = useState<PriceRangePreference>(
    findPricePreset(initialPriceRange),
  );
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<string[]>(initialFavoriteCategoryIds);
  const [favoriteFoodNames, setFavoriteFoodNames] = useState<string[]>(initialFavoriteFoodNames);
  const [dislikedIngredients, setDislikedIngredients] = useState<string[]>(initialDislikedIngredients);
  const [spicePreference, setSpicePreference] = useState<SpicePreference | null>(initialSpicePreference);
  const [vegetarianMode, setVegetarianMode] = useState(initialVegetarianMode);
  const [allowRepeatWithin24h, setAllowRepeatWithin24h] = useState(initialAllowRepeatWithin24h);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToggle, setIsSavingToggle] = useState<string | null>(null);
  const { showToast } = useToast();

  const hasUnsavedChanges =
    displayName !== initialDisplayName ||
    priceRangePreset !== findPricePreset(initialPriceRange) ||
    JSON.stringify(favoriteCategoryIds) !== JSON.stringify(initialFavoriteCategoryIds) ||
    JSON.stringify(favoriteFoodNames) !== JSON.stringify(initialFavoriteFoodNames) ||
    JSON.stringify(dislikedIngredients) !== JSON.stringify(initialDislikedIngredients) ||
    spicePreference !== initialSpicePreference;
  useUnsavedChangesWarning(hasUnsavedChanges);

  function toggleCategory(id: string) {
    setFavoriteCategoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    } catch {
      showToast(getNetworkErrorMessage(), "error");
      setIsUploadingAvatar(false);
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      showToast(getApiErrorMessage(response.status, data.error), "error");
      setIsUploadingAvatar(false);
      return;
    }

    setAvatarUrl(data.avatarUrl);
    showToast("Đã cập nhật ảnh đại diện!", "success");
    setIsUploadingAvatar(false);
  }

  /** Toggle tự lưu ngay (đúng quy ước: toggle = autosave, còn form nhập liệu bên dưới cần bấm "Lưu thay đổi"). */
  async function saveField(key: string, value: unknown, revert: () => void) {
    setIsSavingToggle(key);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        showToast(getApiErrorMessage(response.status, data.error), "error");
        revert();
      }
    } catch {
      showToast(getNetworkErrorMessage(), "error");
      revert();
    } finally {
      setIsSavingToggle(null);
    }
  }

  function handleToggleVegetarian() {
    const next = !vegetarianMode;
    setVegetarianMode(next);
    saveField("vegetarianMode", next, () => setVegetarianMode(!next));
  }

  function handleToggleAllowRepeat() {
    const next = !allowRepeatWithin24h;
    setAllowRepeatWithin24h(next);
    saveField("allowRepeatWithin24h", next, () => setAllowRepeatWithin24h(!next));
  }

  async function handleSave() {
    setIsSaving(true);
    const priceRangeValue = PRICE_RANGE_VALUES[priceRangePreset];

    let response: Response;
    try {
      response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          favoriteCategoryIds,
          priceRange: priceRangeValue,
          favoriteFoodNames,
          dislikedIngredients,
          spicePreference,
        }),
      });
    } catch {
      showToast(getNetworkErrorMessage(), "error");
      setIsSaving(false);
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(getApiErrorMessage(response.status, data.error), "error");
      setIsSaving(false);
      return;
    }

    showToast("Đã lưu Hồ sơ & Sở thích!", "success");
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="tai-khoan" className="scroll-mt-24 flex flex-col gap-4">
        <Card className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0">
            <div className="size-24 rounded-full overflow-hidden bg-primary-soft flex items-center justify-center text-primary text-2xl font-bold">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Ảnh đại diện" width={96} height={96} className="object-cover size-24" />
              ) : (
                (displayName || "?").charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Đổi ảnh đại diện"
              className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary-strong text-white flex items-center justify-center shadow-md hover:bg-primary-strong-hover transition-colors disabled:opacity-60"
            >
              {isUploadingAvatar ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
            <label htmlFor="display-name" className="text-sm font-medium text-text-primary">
              Tên hiển thị
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Tên bạn muốn hiển thị"
              className="w-full h-11 px-4 rounded-xl border border-border bg-surface text-text-primary shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
        </Card>

        <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm font-medium text-text-primary truncate">{email}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Vai trò</p>
            <p className="text-sm font-medium text-text-primary">{ROLE_LABELS[role] ?? role}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">Ngày tham gia</p>
            <p className="text-sm font-medium text-text-primary">{joinedAtLabel}</p>
          </div>
        </Card>
      </div>

      <div id="so-thich" className="scroll-mt-24 flex flex-col gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
          <h2 className="font-semibold text-text-primary">Món yêu thích ưu tiên</h2>
        </div>
        <p className="text-sm text-text-secondary mb-2">Ghi lại để dễ nhớ — chưa dùng để ưu tiên khi random.</p>
        <TagInput
          tags={favoriteFoodNames}
          onAdd={(value) => setFavoriteFoodNames((prev) => (prev.includes(value) ? prev : [...prev, value]))}
          onRemove={(value) => setFavoriteFoodNames((prev) => prev.filter((item) => item !== value))}
          placeholder="+ Thêm món yêu thích"
          tone="blue"
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
          <h2 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="size-4" aria-hidden />
            Món không thích / Dị ứng thực phẩm
          </h2>
        </div>
        <p className="text-sm text-text-secondary mb-2">
          Sẽ tự động bị loại khi random (đã áp dụng thật vào thuật toán).
        </p>
        <TagInput
          tags={dislikedIngredients}
          onAdd={(value) => setDislikedIngredients((prev) => (prev.includes(value) ? prev : [...prev, value]))}
          onRemove={(value) => setDislikedIngredients((prev) => prev.filter((item) => item !== value))}
          placeholder="+ Thêm chất dị ứng"
          tone="red"
        />
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-1">Khoảng giá ưa thích</h2>
        <p className="text-sm text-text-secondary mb-4">Ưu tiên món trong khoảng giá này khi random.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-primary-soft/40">
          {PRICE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPriceRangePreset(option.id)}
              className={cn(
                "text-center py-2.5 px-2 rounded-xl text-sm font-semibold transition-all",
                priceRangePreset === option.id ? "bg-surface text-primary shadow-sm" : "text-text-secondary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-1">Độ cay ưa thích</h2>
        <p className="text-sm text-text-secondary mb-4">Ưu tiên món đúng độ cay này khi random.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPICE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSpicePreference((prev) => (prev === option.id ? null : option.id))}
              className={cn(
                "p-3.5 rounded-xl transition-all flex flex-col items-center justify-center text-center",
                spicePreference === option.id ? "bg-primary-soft text-primary shadow-sm" : "bg-primary-soft/30 text-text-secondary",
              )}
            >
              <span className="font-semibold text-text-primary">{option.label}</span>
              <span className="text-xs text-text-secondary">{option.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 flex items-center justify-between">
        <div className="space-y-0.5 pr-4">
          <div className="font-semibold text-text-primary flex items-center gap-2">
            <Leaf className="size-4 text-success" aria-hidden />
            <span>Chế độ ăn chay (Vegetarian)</span>
          </div>
          <p className="text-sm text-text-secondary">Chỉ gợi ý các món chay khi random.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSavingToggle === "vegetarianMode" && <Loader2 className="size-4 animate-spin text-text-secondary" aria-hidden />}
          <Toggle checked={vegetarianMode} onChange={handleToggleVegetarian} label="Chế độ ăn chay" />
        </div>
      </Card>

      <Card className="p-6 flex items-center justify-between">
        <div className="space-y-0.5 pr-4">
          <div className="font-semibold text-text-primary flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            <span>Cho phép trùng lặp món trong 24 giờ</span>
          </div>
          <p className="text-sm text-text-secondary">
            Bật: random có thể ra lại món bạn vừa được gợi ý/đã ăn hôm nay. Tắt: tự loại các món đó khỏi kết quả.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSavingToggle === "allowRepeatWithin24h" && (
            <Loader2 className="size-4 animate-spin text-text-secondary" aria-hidden />
          )}
          <Toggle checked={allowRepeatWithin24h} onChange={handleToggleAllowRepeat} label="Cho phép trùng lặp món trong 24 giờ" />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-1">Danh mục yêu thích</h2>
        <p className="text-sm text-text-secondary mb-4">Chọn các nhóm món bạn hay ăn nhất.</p>
        {categories.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Chưa có danh mục nào — chạy <code className="text-xs bg-primary-soft px-1.5 py-0.5 rounded">npm run seed:categories</code> để nạp danh mục.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = favoriteCategoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    isActive
                      ? "bg-primary-soft border-primary text-primary"
                      : "bg-surface border-border text-text-secondary hover:text-text-primary",
                  )}
                >
                  {isActive && <Check className="size-3.5" aria-hidden />}
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </Card>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <div className="flex items-center gap-3 bg-surface border border-border shadow-lg rounded-full px-2 py-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-text-secondary pl-3 hidden sm:inline">Có thay đổi chưa lưu</span>
          )}
          <Button onClick={handleSave} isLoading={isSaving} disabled={!hasUnsavedChanges}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}

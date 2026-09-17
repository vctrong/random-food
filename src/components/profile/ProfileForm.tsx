"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProfileFormProps {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialPriceRange: { min: number; max: number } | null;
  initialFavoriteCategoryIds: string[];
  categories: CategoryOption[];
}

export function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
  initialPriceRange,
  initialFavoriteCategoryIds,
  categories,
}: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [priceMin, setPriceMin] = useState(initialPriceRange?.min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initialPriceRange?.max?.toString() ?? "");
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<string[]>(
    initialFavoriteCategoryIds,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  function toggleCategory(id: string) {
    setFavoriteCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
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

  async function handleSave() {
    setIsSaving(true);
    const priceRange =
      priceMin && priceMax ? { min: Number(priceMin), max: Number(priceMax) } : undefined;

    let response: Response;
    try {
      response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, favoriteCategoryIds, priceRange }),
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
    <div className="flex flex-col gap-6">
      <Card className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="size-24 rounded-full overflow-hidden bg-soft-blue flex items-center justify-center text-primary-blue text-2xl font-bold">
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
            className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary-blue text-white flex items-center justify-center shadow-md hover:bg-[#4a8ddb] transition-colors disabled:opacity-60"
          >
            {isUploadingAvatar ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="size-4" aria-hidden />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
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
            className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-1">Khoảng giá ưa thích</h2>
        <p className="text-sm text-text-secondary mb-4">
          Dùng để gợi ý món phù hợp túi tiền của bạn trong tương lai.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
            placeholder="Tối thiểu (đ)"
            className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
          />
          <span className="text-text-secondary">—</span>
          <input
            type="number"
            min={0}
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder="Tối đa (đ)"
            className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-1">Danh mục yêu thích</h2>
        <p className="text-sm text-text-secondary mb-4">Chọn các nhóm món bạn hay ăn nhất.</p>
        {categories.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Chưa có danh mục nào — chạy <code className="text-xs bg-soft-blue px-1.5 py-0.5 rounded">npm run seed:categories</code> để nạp danh mục.
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
                      ? "bg-soft-blue border-primary-blue text-primary-blue"
                      : "bg-white border-border text-text-secondary hover:text-text-primary",
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

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving}>
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

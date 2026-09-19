"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  PlusCircle,
  Search,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import type { EatingLevel } from "@/types/food";
import { EATING_LEVELS } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { LocationPicker, DEFAULT_CAN_THO_CENTER } from "@/components/map/LocationPicker";

interface CategoryOption {
  id: string;
  name: string;
}

interface RestaurantOption {
  id: string;
  name: string;
  address: string;
}

const MAX_IMAGES = 5;

interface ImageDraft {
  file: File;
  previewUrl: string;
}

export function ContributeFoodForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restaurantDebounceRef = useRef<number | null>(null);

  const [images, setImages] = useState<ImageDraft[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [eatingLevels, setEatingLevels] = useState<EatingLevel[]>([]);

  const [restaurantMode, setRestaurantMode] = useState<"existing" | "new">("existing");
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<RestaurantOption[]>([]);
  const [isSearchingRestaurant, setIsSearchingRestaurant] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOption | null>(null);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [newRestaurantLocation, setNewRestaurantLocation] = useState(DEFAULT_CAN_THO_CENTER);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    const hasRestaurant =
      restaurantMode === "existing"
        ? Boolean(selectedRestaurant)
        : Boolean(newRestaurantName.trim() && newRestaurantAddress.trim());

    return (
      name.trim().length > 0 &&
      description.trim().length > 0 &&
      images.length > 0 &&
      priceMin !== "" &&
      priceMax !== "" &&
      Number(priceMin) >= 0 &&
      Number(priceMax) >= Number(priceMin) &&
      categoryIds.length > 0 &&
      eatingLevels.length > 0 &&
      hasRestaurant
    );
  }, [
    name,
    description,
    images.length,
    priceMin,
    priceMax,
    categoryIds.length,
    eatingLevels.length,
    restaurantMode,
    selectedRestaurant,
    newRestaurantName,
    newRestaurantAddress,
  ]);

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setImages((prev) => {
      const combined = [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      return combined.slice(0, MAX_IMAGES);
    });
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleEatingLevel(level: EatingLevel) {
    setEatingLevels((prev) => (prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level]));
  }

  function handleRestaurantQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setRestaurantQuery(nextQuery);
    setSelectedRestaurant(null);

    if (restaurantDebounceRef.current) window.clearTimeout(restaurantDebounceRef.current);
    if (nextQuery.trim().length < 2) {
      setRestaurantResults([]);
      return;
    }

    restaurantDebounceRef.current = window.setTimeout(async () => {
      setIsSearchingRestaurant(true);
      try {
        const response = await fetch(`/api/restaurants?q=${encodeURIComponent(nextQuery)}`);
        const data = await response.json();
        setRestaurantResults(Array.isArray(data) ? data : []);
      } catch {
        setRestaurantResults([]);
      } finally {
        setIsSearchingRestaurant(false);
      }
    }, 400);
  }

  function selectRestaurant(restaurant: RestaurantOption) {
    setSelectedRestaurant(restaurant);
    setRestaurantQuery(restaurant.name);
    setRestaurantResults([]);
  }

  async function handleSubmit() {
    if (!isFormValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("priceMin", priceMin);
    formData.append("priceMax", priceMax);
    categoryIds.forEach((id) => formData.append("categoryIds", id));
    eatingLevels.forEach((level) => formData.append("eatingLevels", level));
    images.forEach((image) => formData.append("images", image.file));

    formData.append("restaurantMode", restaurantMode);
    if (restaurantMode === "existing" && selectedRestaurant) {
      formData.append("restaurantId", selectedRestaurant.id);
    } else {
      formData.append("restaurantName", newRestaurantName.trim());
      formData.append("restaurantAddress", newRestaurantAddress.trim());
      formData.append("restaurantLat", String(newRestaurantLocation.lat));
      formData.append("restaurantLng", String(newRestaurantLocation.lng));
    }

    try {
      const response = await fetch("/api/foods", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        const message = getApiErrorMessage(response.status, data.error);
        setError(message);
        showToast(message, "error");
        setIsSubmitting(false);
        return;
      }

      showToast("Đã gửi món ăn! Đội kiểm duyệt sẽ xem xét trước khi công khai.", "success");
      router.push("/dong-gop");
      router.refresh();
    } catch {
      setIsSubmitting(false);
      showToast(getNetworkErrorMessage(), "error");
      return;
    }
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Ảnh món ăn */}
      <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
        <h2 className="font-heading font-semibold text-text-primary mb-1">Ảnh món ăn</h2>
        <p className="text-sm text-text-secondary mb-4">Tối đa {MAX_IMAGES} ảnh, ảnh đầu tiên sẽ là ảnh đại diện.</p>
        <div className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <div key={image.previewUrl} className="relative size-24 rounded-xl overflow-hidden border border-border shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview cục bộ, next/image không hỗ trợ blob: URL */}
              <img src={image.previewUrl} alt={`Ảnh món ăn ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label="Xoá ảnh"
                className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="size-24 rounded-xl border-2 border-dashed border-border text-text-secondary hover:text-primary-blue hover:border-primary-blue flex flex-col items-center justify-center gap-1 transition-colors shrink-0"
            >
              <ImagePlus className="size-5" aria-hidden />
              <span className="text-xs font-medium">Thêm ảnh</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImagesChange}
          />
        </div>
      </section>

      {/* Thông tin món ăn */}
      <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Thông tin món ăn</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="food-name" className="text-sm font-medium text-text-primary">
            Tên món ăn
          </label>
          <input
            id="food-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Vd: Bún bò Huế đặc biệt"
            className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="food-description" className="text-sm font-medium text-text-primary">
            Mô tả
          </label>
          <textarea
            id="food-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Món ăn có gì đặc biệt, hương vị ra sao..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price-min" className="text-sm font-medium text-text-primary">
              Giá từ (đ)
            </label>
            <input
              id="price-min"
              type="number"
              min={0}
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
              placeholder="25000"
              className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price-max" className="text-sm font-medium text-text-primary">
              Đến (đ)
            </label>
            <input
              id="price-max"
              type="number"
              min={0}
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              placeholder="45000"
              className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Mức độ ăn phù hợp</span>
          <div className="flex flex-wrap gap-2">
            {EATING_LEVELS.map((level) => {
              const active = eatingLevels.includes(level.id);
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => toggleEatingLevel(level.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
                    active
                      ? "bg-primary-blue border-primary-blue text-white shadow-sm"
                      : "bg-white border-border text-text-secondary hover:text-text-primary",
                  )}
                >
                  {active && <Check className="size-3.5" aria-hidden />}
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Danh mục</span>
          {categories.length === 0 ? (
            <p className="text-sm text-text-secondary">Hệ thống chưa có danh mục nào.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
                      active
                        ? "bg-soft-pink border-primary-pink text-primary-pink"
                        : "bg-white border-border text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {active && <Check className="size-3.5" aria-hidden />}
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quán ăn */}
      <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Quán bán món này</h2>

        <div className="inline-flex p-1 rounded-full bg-soft-blue/50 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setRestaurantMode("existing")}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              restaurantMode === "existing" ? "bg-white text-primary-blue shadow-sm" : "text-text-secondary",
            )}
          >
            <Search className="size-3.5" aria-hidden />
            Quán đã có sẵn
          </button>
          <button
            type="button"
            onClick={() => setRestaurantMode("new")}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              restaurantMode === "new" ? "bg-white text-primary-blue shadow-sm" : "text-text-secondary",
            )}
          >
            <PlusCircle className="size-3.5" aria-hidden />
            Quán mới
          </button>
        </div>

        {restaurantMode === "existing" ? (
          <div className="relative">
            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              type="text"
              value={restaurantQuery}
              onChange={handleRestaurantQueryChange}
              placeholder="Tìm theo tên quán..."
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-white text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
            />
            {isSearchingRestaurant && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary animate-spin" aria-hidden />
            )}
            {restaurantResults.length > 0 && (
              <ul className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-border overflow-hidden max-h-60 overflow-y-auto">
                {restaurantResults.map((restaurant) => (
                  <li key={restaurant.id}>
                    <button
                      type="button"
                      onClick={() => selectRestaurant(restaurant)}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors"
                    >
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-xs text-text-secondary line-clamp-1">{restaurant.address}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedRestaurant && (
              <div className="mt-2 flex items-center gap-2 text-sm text-success">
                <Check className="size-4" aria-hidden />
                Đã chọn: <span className="font-medium">{selectedRestaurant.name}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="restaurant-name" className="text-sm font-medium text-text-primary">
                Tên quán
              </label>
              <input
                id="restaurant-name"
                value={newRestaurantName}
                onChange={(event) => setNewRestaurantName(event.target.value)}
                placeholder="Vd: Quán Bún Bò Cô Ba"
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="restaurant-address" className="text-sm font-medium text-text-primary">
                Địa chỉ
              </label>
              <input
                id="restaurant-address"
                value={newRestaurantAddress}
                onChange={(event) => setNewRestaurantAddress(event.target.value)}
                placeholder="Vd: 123 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ"
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                <MapPin className="size-4 text-primary-pink" aria-hidden />
                Vị trí trên bản đồ
              </span>
              <LocationPicker value={newRestaurantLocation} onChange={setNewRestaurantLocation} />
            </div>
          </div>
        )}

        <p className="text-xs text-text-secondary flex items-start gap-1.5">
          <Sparkles className="size-3.5 shrink-0 mt-0.5 text-primary-blue" aria-hidden />
          Món ăn và quán mới sẽ ở trạng thái chờ duyệt cho đến khi đội kiểm duyệt xác nhận.
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!isFormValid} size="lg">
          Gửi món ăn để duyệt
        </Button>
      </div>
    </div>
  );
}

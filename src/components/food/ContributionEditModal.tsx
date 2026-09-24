"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, ImagePlus, MapPin, MessageSquareText, X } from "lucide-react";
import { EATING_LEVELS } from "@/constants/categories";
import { MAX_FOOD_IMAGES, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";
import { cn } from "@/lib/utils";
import { resubmitContribution } from "@/services/contributionService";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { LocationPicker, DEFAULT_CAN_THO_CENTER } from "@/components/map/LocationPicker";
import { getCurrentFeedback } from "@/components/food/ContributionCard";
import type { EatingLevel } from "@/types/food";
import type { Contribution } from "@/types/contribution";

interface CategoryOption {
  id: string;
  name: string;
}

interface ContributionEditModalProps {
  contribution: Contribution | null;
  categories: CategoryOption[];
  onClose: () => void;
  onSubmitted: () => void;
}

interface ImageDraft {
  file: File;
  previewUrl: string;
}

const INPUT_CLASS =
  "w-full h-11 px-4 rounded-xl border border-border bg-surface text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

export function ContributionEditModal({ contribution, categories, onClose, onSubmitted }: ContributionEditModalProps) {
  return (
    <Modal isOpen={contribution !== null} onClose={onClose} panelClassName="max-w-2xl">
      {contribution && (
        // key theo id để state form luôn khởi tạo lại từ dữ liệu của đúng đóng góp đang mở.
        <EditForm key={contribution.id} contribution={contribution} categories={categories} onClose={onClose} onSubmitted={onSubmitted} />
      )}
    </Modal>
  );
}

function EditForm({
  contribution,
  categories,
  onClose,
  onSubmitted,
}: Omit<ContributionEditModalProps, "contribution"> & { contribution: Contribution }) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { food: canEditFood, restaurant: canEditRestaurant } = contribution.editable;
  const restaurant = contribution.restaurant;

  const [name, setName] = useState(contribution.name);
  const [description, setDescription] = useState(contribution.description);
  const [priceMin, setPriceMin] = useState(contribution.priceMin !== null ? String(contribution.priceMin) : "");
  const [priceMax, setPriceMax] = useState(contribution.priceMax !== null ? String(contribution.priceMax) : "");
  const [categoryIds, setCategoryIds] = useState<string[]>(contribution.categories.map((category) => category.id));
  const [eatingLevels, setEatingLevels] = useState<EatingLevel[]>(contribution.eatingLevels);
  const [keptImages, setKeptImages] = useState<string[]>(contribution.images);
  const [newImages, setNewImages] = useState<ImageDraft[]>([]);

  const [restaurantName, setRestaurantName] = useState(restaurant?.name ?? "");
  const [restaurantAddress, setRestaurantAddress] = useState(restaurant?.address ?? "");
  const [restaurantLocation, setRestaurantLocation] = useState(restaurant?.location ?? DEFAULT_CAN_THO_CENTER);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Giải phóng blob URL của ảnh xem trước khi đóng form.
  const newImagesRef = useRef(newImages);
  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);
  useEffect(() => () => newImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), []);

  const imageCount = keptImages.length + newImages.length;
  const feedback = getCurrentFeedback(contribution);

  const isValid = useMemo(() => {
    const foodOk =
      !canEditFood ||
      (name.trim().length > 0 &&
        description.trim().length > 0 &&
        priceMin !== "" &&
        priceMax !== "" &&
        Number(priceMin) >= 0 &&
        Number(priceMax) >= Number(priceMin) &&
        categoryIds.length > 0 &&
        eatingLevels.length > 0 &&
        imageCount >= 1);
    const restaurantOk = !canEditRestaurant || (restaurantName.trim().length > 0 && restaurantAddress.trim().length > 0);
    return foodOk && restaurantOk;
  }, [canEditFood, canEditRestaurant, name, description, priceMin, priceMax, categoryIds.length, eatingLevels.length, imageCount, restaurantName, restaurantAddress]);

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const valid = files.filter((file) => file.type.startsWith("image/") && file.size <= MAX_FOOD_IMAGE_BYTES);
    if (valid.length < files.length) setError("Chỉ nhận tệp hình dưới 5MB, một số tệp đã bị bỏ qua.");
    else setError(null);

    const room = Math.max(0, MAX_FOOD_IMAGES - imageCount);
    setNewImages((prev) => [...prev, ...valid.slice(0, room).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    if (canEditFood) {
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("priceMin", priceMin);
      formData.append("priceMax", priceMax);
      categoryIds.forEach((id) => formData.append("categoryIds", id));
      eatingLevels.forEach((level) => formData.append("eatingLevels", level));
      keptImages.forEach((url) => formData.append("keepImages", url));
      newImages.forEach((image) => formData.append("images", image.file));
    }
    if (canEditRestaurant) {
      formData.append("restaurantName", restaurantName.trim());
      formData.append("restaurantAddress", restaurantAddress.trim());
      formData.append("restaurantLat", String(restaurantLocation.lat));
      formData.append("restaurantLng", String(restaurantLocation.lng));
    }

    const result = await resubmitContribution(contribution.id, formData);
    setIsSubmitting(false);

    if (!result.ok) {
      const message = result.error ?? "Không thể gửi lại, vui lòng thử lại.";
      setError(message);
      showToast(message, "error");
      return;
    }

    showToast("Đã gửi lại! Đội kiểm duyệt sẽ xem xét đóng góp của bạn.", "success");
    onSubmitted();
    onClose();
  }

  return (
    <div className="max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="pr-10">
        <h3 className="text-xl font-heading font-semibold text-text-primary">Chỉnh sửa & nộp lại</h3>
        <p className="text-sm text-text-secondary mt-0.5">Sau khi gửi, đóng góp quay lại trạng thái chờ duyệt.</p>
      </div>

      {feedback.length > 0 && (
        <div className="p-3 rounded-xl bg-warning/15 flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <MessageSquareText className="size-4" aria-hidden />
            Đội kiểm duyệt yêu cầu:
          </span>
          {feedback.map((item) => (
            <p key={item.label} className="text-sm text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-primary">{item.label}: </span>“{item.text}”
            </p>
          ))}
        </div>
      )}

      {canEditFood && (
        <section className="flex flex-col gap-4">
          <h4 className="font-heading font-semibold text-text-primary">Thông tin món ăn</h4>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Ảnh món ăn <span className="text-text-secondary font-normal">({imageCount}/{MAX_FOOD_IMAGES})</span>
            </span>
            <div className="flex flex-wrap gap-3">
              {keptImages.map((url, index) => (
                <ImageThumb key={url} src={url} label={`Ảnh ${index + 1}`} onRemove={() => setKeptImages((prev) => prev.filter((item) => item !== url))} />
              ))}
              {newImages.map((image, index) => (
                <ImageThumb key={image.previewUrl} src={image.previewUrl} label={`Ảnh mới ${index + 1}`} onRemove={() => removeNewImage(index)} />
              ))}
              {imageCount < MAX_FOOD_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="size-24 rounded-xl border-2 border-dashed border-border text-text-secondary hover:text-primary hover:border-primary flex flex-col items-center justify-center gap-1 transition-colors shrink-0"
                >
                  <ImagePlus className="size-5" aria-hidden />
                  <span className="text-xs font-medium">Thêm ảnh</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-food-name" className="text-sm font-medium text-text-primary">Tên món ăn</label>
            <input id="edit-food-name" value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-food-description" className="text-sm font-medium text-text-primary">Mô tả</label>
            <textarea
              id="edit-food-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-price-min" className="text-sm font-medium text-text-primary">Giá từ (đ)</label>
              <input id="edit-price-min" type="number" min={0} value={priceMin} onChange={(event) => setPriceMin(event.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-price-max" className="text-sm font-medium text-text-primary">Đến (đ)</label>
              <input id="edit-price-max" type="number" min={0} value={priceMax} onChange={(event) => setPriceMax(event.target.value)} className={INPUT_CLASS} />
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
                    onClick={() => setEatingLevels((prev) => toggle(prev, level.id))}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
                      active ? "bg-primary-strong border-primary text-white shadow-sm" : "bg-surface border-border text-text-secondary hover:text-text-primary",
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
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryIds((prev) => toggle(prev, category.id))}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
                      active ? "bg-accent-soft border-accent text-accent-ink" : "bg-surface border-border text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {active && <Check className="size-3.5" aria-hidden />}
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {canEditRestaurant && (
        <section className="flex flex-col gap-4">
          <h4 className="font-heading font-semibold text-text-primary">Thông tin quán ăn</h4>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-restaurant-name" className="text-sm font-medium text-text-primary">Tên quán</label>
            <input id="edit-restaurant-name" value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-restaurant-address" className="text-sm font-medium text-text-primary">Địa chỉ</label>
            <input id="edit-restaurant-address" value={restaurantAddress} onChange={(event) => setRestaurantAddress(event.target.value)} className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
              <MapPin className="size-4 text-accent-ink" aria-hidden />
              Vị trí trên bản đồ
            </span>
            <LocationPicker value={restaurantLocation} onChange={setRestaurantLocation} />
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!isValid}>
          Nộp lại để duyệt
        </Button>
      </div>
    </div>
  );
}

function ImageThumb({ src, label, onRemove }: { src: string; label: string; onRemove: () => void }) {
  return (
    <div className="relative size-24 rounded-xl overflow-hidden border border-border shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- gồm cả blob preview cục bộ, next/image không hỗ trợ blob: URL */}
      <img src={src} alt={label} className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Xoá ${label}`}
        className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, ImagePlus, Lock, MapPin, MessageSquareText, X } from "lucide-react";
import { EATING_LEVELS } from "@/constants/categories";
import { MAX_FOOD_IMAGES, MAX_FOOD_IMAGE_BYTES } from "@/constants/limits";
import { MAX_PENDING_EDITS } from "@/features/contributions/submissionRules";
import { cn } from "@/lib/utils";
import { saveContributionEdit } from "@/services/contributionService";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { LocationPicker, DEFAULT_CAN_THO_CENTER } from "@/components/map/LocationPicker";
import { RestaurantPicker } from "@/components/restaurant/RestaurantPicker";
import { OpeningHoursField } from "@/components/restaurant/OpeningHoursField";
import { OpeningHoursSummary } from "@/components/restaurant/OpeningHoursSummary";
import { validateOpeningSchedule } from "@/features/opening-hours/openingHours";
import { getCurrentFeedback, getEditActionLabel } from "@/components/food/ContributionCard";
import type { EatingLevel } from "@/types/food";
import type { Contribution } from "@/types/contribution";
import type { RestaurantOption } from "@/types/restaurant";

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
  // Nhóm nặng (chỉ khi pending): đổi sang quán có sẵn, hoặc sửa chi tiết quán mới do chính user tạo.
  const canEditDetails = canEditRestaurant && Boolean(restaurant?.canEditDetails);
  /** needs_revision: lưu là gửi lại luôn → pending. pending: lưu, trừ 1 lượt sửa. */
  const isResubmit = contribution.foodStatus === "needs_revision";

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
  // Quán chưa có toạ độ: chỉ gửi vị trí khi user thật sự kéo ghim (không lưu tâm bản đồ mặc định).
  const [isLocationTouched, setIsLocationTouched] = useState(false);
  const [switchTo, setSwitchTo] = useState<RestaurantOption | null>(null);
  const [openingSchedule, setOpeningSchedule] = useState(restaurant?.openingSchedule ?? null);
  const isScheduleDirty = JSON.stringify(openingSchedule) !== JSON.stringify(restaurant?.openingSchedule ?? null);
  const scheduleError = openingSchedule ? validateOpeningSchedule(openingSchedule) : null;

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

  const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((item, index) => item === b[index]);
  const isFoodDirty =
    name.trim() !== contribution.name ||
    description.trim() !== contribution.description ||
    priceMin !== (contribution.priceMin !== null ? String(contribution.priceMin) : "") ||
    priceMax !== (contribution.priceMax !== null ? String(contribution.priceMax) : "") ||
    !sameList([...categoryIds].sort(), contribution.categories.map((category) => category.id).sort()) ||
    !sameList([...eatingLevels].sort(), [...contribution.eatingLevels].sort()) ||
    !sameList(keptImages, contribution.images) ||
    newImages.length > 0;
  const isDetailsDirty =
    canEditDetails &&
    !switchTo &&
    (restaurantName.trim() !== (restaurant?.name ?? "") ||
      restaurantAddress.trim() !== (restaurant?.address ?? "") ||
      isLocationTouched ||
      isScheduleDirty);
  const isRestaurantDirty = switchTo !== null || isDetailsDirty;
  // Sửa khi pending tốn 1 lượt nên phải có thay đổi; gửi lại từ needs_revision thì luôn cho gửi.
  const hasChanges = isResubmit || (canEditFood && isFoodDirty) || (canEditRestaurant && isRestaurantDirty);

  const isValid = useMemo(() => {
    const foodOk =
      !canEditFood ||
      (name.trim().length > 0 &&
        priceMin !== "" &&
        priceMax !== "" &&
        Number(priceMin) >= 0 &&
        Number(priceMax) >= Number(priceMin) &&
        categoryIds.length > 0 &&
        eatingLevels.length > 0 &&
        imageCount >= 1);
    const restaurantOk =
      !isDetailsDirty || (restaurantName.trim().length > 0 && restaurantAddress.trim().length > 0 && !scheduleError);
    return foodOk && restaurantOk;
  }, [canEditFood, isDetailsDirty, name, priceMin, priceMax, categoryIds.length, eatingLevels.length, imageCount, restaurantName, restaurantAddress, scheduleError]);

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
    if (!isValid || !hasChanges || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    if (canEditFood && (isResubmit || isFoodDirty)) {
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("priceMin", priceMin);
      formData.append("priceMax", priceMax);
      categoryIds.forEach((id) => formData.append("categoryIds", id));
      eatingLevels.forEach((level) => formData.append("eatingLevels", level));
      keptImages.forEach((url) => formData.append("keepImages", url));
      newImages.forEach((image) => formData.append("images", image.file));
    }
    if (canEditRestaurant && switchTo) {
      formData.append("restaurantId", switchTo.id);
    } else if (isDetailsDirty) {
      formData.append("restaurantName", restaurantName.trim());
      formData.append("restaurantAddress", restaurantAddress.trim());
      if (restaurant?.location || isLocationTouched) {
        formData.append("restaurantLat", String(restaurantLocation.lat));
        formData.append("restaurantLng", String(restaurantLocation.lng));
      }
      if (openingSchedule) formData.append("restaurantOpeningSchedule", JSON.stringify(openingSchedule));
    }

    const result = await saveContributionEdit(contribution.id, formData);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      // Đề xuất có thể vừa đổi trạng thái (vd. đã được nhận xác minh) — tải lại để form/nút khớp thực tế.
      onSubmitted();
      return;
    }

    showToast(
      isResubmit
        ? "Đã gửi lại! Đề xuất quay về chờ FoodReviewer xác minh."
        : `Đã lưu thay đổi. Bạn còn ${result.remainingEdits ?? 0}/${MAX_PENDING_EDITS} lần sửa.`,
      "success",
    );
    onSubmitted();
    onClose();
  }

  const restaurantLockReason =
    "Khi đang cần chỉnh sửa, không đổi được quán / địa chỉ / vị trí. Muốn đổi quán, hãy rút đề xuất và tạo đề xuất mới.";

  return (
    <div className="max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="pr-10">
        <h3 className="text-xl font-heading font-semibold text-text-primary">{getEditActionLabel(contribution)}</h3>
        <p className="text-sm text-text-secondary mt-0.5">
          {isResubmit ? (
            "Sau khi gửi lại, đề xuất quay về chờ FoodReviewer xác minh."
          ) : (
            <>
              Đề xuất vẫn chờ xác minh sau khi lưu. Còn{" "}
              <span className="font-semibold text-text-primary">
                {contribution.remainingEdits ?? 0}/{MAX_PENDING_EDITS}
              </span>{" "}
              lần sửa — hết lượt thì cần rút và tạo đề xuất mới.
            </>
          )}
        </p>
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

      {restaurant && !canEditRestaurant && (
        <section className="flex flex-col gap-2 p-4 rounded-2xl bg-background">
          <h4 className="font-heading font-semibold text-text-primary flex items-center gap-1.5">
            <Lock className="size-4 text-text-secondary" aria-hidden />
            Quán ăn
          </h4>
          <p className="text-sm text-text-primary">
            {restaurant.name} <span className="text-text-secondary">· {restaurant.address}</span>
          </p>
          <OpeningHoursSummary schedule={restaurant.openingSchedule} className="text-xs text-text-secondary" />
          <p className="text-xs text-text-secondary">{restaurantLockReason}</p>
        </section>
      )}

      {canEditRestaurant && restaurant && (
        <section className="flex flex-col gap-4">
          <h4 id="edit-restaurant-heading" className="font-heading font-semibold text-text-primary">
            Quán ăn
          </h4>

          {switchTo ? (
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-primary-soft/60">
              <p className="text-sm text-text-primary">
                Đổi sang: <span className="font-semibold">{switchTo.name}</span>
                <span className="block text-xs text-text-secondary">{switchTo.address}</span>
              </p>
              {restaurant.isOwnedByUser && restaurant.status === "pending" && (
                <p className="text-xs text-text-secondary">
                  Quán mới “{restaurant.name}” bạn tạo sẽ được bỏ khỏi hàng chờ nếu không còn món nào dùng.
                </p>
              )}
              <button
                type="button"
                onClick={() => setSwitchTo(null)}
                className="self-start text-xs font-semibold text-primary hover:underline"
              >
                Giữ quán cũ
              </button>
            </div>
          ) : canEditDetails ? (
            <>
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
                <LocationPicker
                  value={restaurantLocation}
                  onChange={(next) => {
                    setRestaurantLocation(next);
                    setIsLocationTouched(true);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span id="edit-opening-hours" className="text-sm font-medium text-text-primary">
                  Giờ mở cửa
                </span>
                <OpeningHoursField
                  value={openingSchedule}
                  onChange={setOpeningSchedule}
                  showErrors={isScheduleDirty}
                  labelledBy="edit-opening-hours"
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-text-primary p-4 rounded-2xl bg-background flex flex-col gap-1">
              <p>
                {restaurant.name} <span className="text-text-secondary">· {restaurant.address}</span>
              </p>
              <OpeningHoursSummary schedule={restaurant.openingSchedule} className="text-xs text-text-secondary" />
            </div>
          )}

          {!switchTo && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-text-secondary">
                {canEditDetails ? "Hoặc quán này đã có sẵn trên NayAnGi? Chọn quán đó:" : "Chọn nhầm quán? Đổi sang quán khác:"}
              </span>
              <RestaurantPicker selected={null} onSelect={setSwitchTo} labelledBy="edit-restaurant-heading" />
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={!isValid || !hasChanges}>
          {isResubmit ? "Lưu & gửi lại" : "Lưu thay đổi"}
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

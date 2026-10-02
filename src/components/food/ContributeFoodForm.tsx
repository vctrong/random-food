"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EATING_LEVELS } from "@/constants/categories";
import { MAX_FOOD_IMAGES, MAX_RESTAURANT_IMAGES } from "@/constants/limits";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useToast } from "@/components/ui/ToastProvider";
import { ImageUploader } from "@/components/food/ImageUploader";
import { CategoryPicker } from "@/components/food/CategoryPicker";
import { RestaurantPicker } from "@/components/restaurant/RestaurantPicker";
import { RestaurantLocationField } from "@/components/map/RestaurantLocationField";
import { OpeningHoursField } from "@/components/restaurant/OpeningHoursField";
import { useContributeFoodForm } from "@/features/contribute-food/useContributeFoodForm";
import { formatPriceInput, isPriceValid, parsePrice } from "@/features/contribute-food/formProgress";
import type { CategoryOption } from "@/types/category";

const inputClass =
  "w-full h-11 px-4 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary/80 transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

const sectionClass = "bg-surface border border-border rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5";

export function ContributeFoodForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const form = useContributeFoodForm();
  const ids = {
    images: useId(),
    name: useId(),
    description: useId(),
    price: useId(),
    priceMin: useId(),
    priceMax: useId(),
    levels: useId(),
    categories: useId(),
    restaurant: useId(),
    restaurantName: useId(),
    restaurantAddress: useId(),
    restaurantImages: useId(),
    openingHours: useId(),
  };

  const minPrice = parsePrice(form.priceMin);
  const maxPrice = parsePrice(form.priceMax);
  const priceError = minPrice !== null && maxPrice !== null && !isPriceValid(minPrice, maxPrice);
  const canSubmit = form.missingCount === 0 && !form.isUploading && !form.isSubmitting;

  async function handleSubmit() {
    const ok = await form.submit();
    if (!ok) return;
    showToast("Đã gửi món! Đội kiểm duyệt sẽ xem xét trước khi công khai.", "success");
    router.push("/dong-gop");
    router.refresh();
  }

  const submitLabel = form.isSubmitting
    ? "Đang gửi món…"
    : form.isUploading
      ? "Chờ ảnh tải xong nha…"
      : form.missingCount > 0
        ? `Còn ${form.missingCount} mục nữa là xong ✦`
        : "Gửi món lên NayAnGi 🎉";

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <span aria-hidden className="text-accent animate-required-breathe inline-block">
          ✦
        </span>
        là mấy mục cần điền nha
      </p>

      {/* Món ăn */}
      <section className={sectionClass} aria-labelledby="section-food">
        <h2 id="section-food" className="text-h4 text-text-primary">
          Món ăn
        </h2>

        <div className="flex flex-col gap-2">
          <FieldLabel id={ids.images} required valid={form.validity.images} hint={`Tối đa ${MAX_FOOD_IMAGES} ảnh, ảnh đầu tiên là ảnh bìa.`}>
            Ảnh món ăn
          </FieldLabel>
          <ImageUploader
            uploads={form.foodImages}
            labelledBy={ids.images}
            required
            hint="Ảnh chụp thật, rõ món — được nén tự động trước khi tải lên."
            onOverflow={() => showToast(`Món ăn tối đa ${MAX_FOOD_IMAGES} ảnh thôi nha.`, "warning")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={ids.name} required valid={form.validity.name}>
            Tên món
          </FieldLabel>
          <input
            id={ids.name}
            value={form.name}
            maxLength={120}
            aria-required
            onChange={(event) => form.setName(event.target.value)}
            placeholder="Vd: Hủ tiếu Nam Vang"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={ids.description}>Mô tả</FieldLabel>
          <textarea
            id={ids.description}
            value={form.description}
            maxLength={2000}
            rows={3}
            onChange={(event) => form.setDescription(event.target.value)}
            placeholder="Món có gì đặc biệt, vị ra sao…"
            className={cn(inputClass, "h-auto py-2.5 resize-none")}
          />
        </div>

        <div className="flex flex-col gap-1.5" role="group" aria-labelledby={ids.price}>
          <FieldLabel id={ids.price} required valid={form.validity.price}>
            Giá tham khảo
          </FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: ids.priceMin, label: "Từ", value: form.priceMin, set: form.setPriceMin, placeholder: "25.000" },
                { id: ids.priceMax, label: "Đến", value: form.priceMax, set: form.setPriceMax, placeholder: "45.000" },
              ] as const
            ).map((field) => (
              <div key={field.id} className="relative">
                <label htmlFor={field.id} className="sr-only">
                  Giá {field.label.toLowerCase()} (đồng)
                </label>
                <span aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                  {field.label}
                </span>
                <input
                  id={field.id}
                  inputMode="numeric"
                  aria-required
                  aria-invalid={priceError || undefined}
                  value={field.value}
                  onChange={(event) => field.set(formatPriceInput(event.target.value))}
                  placeholder={field.placeholder}
                  className={cn(inputClass, "pl-12 pr-8 tabular-nums", priceError && "border-accent-strong")}
                />
                <span aria-hidden className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                  đ
                </span>
              </div>
            ))}
          </div>
          {priceError && <p className="text-xs text-accent-ink">Giá “đến” phải lớn hơn hoặc bằng giá “từ” nha.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel id={ids.levels} required valid={form.validity.eatingLevels} hint="Chọn được nhiều mức.">
            Mức độ ăn
          </FieldLabel>
          <div role="group" aria-labelledby={ids.levels} className="flex flex-wrap gap-2">
            {EATING_LEVELS.map((level) => {
              const active = form.eatingLevels.includes(level.id);
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => form.toggleEatingLevel(level.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    active
                      ? "bg-primary-strong border-primary-strong text-white"
                      : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-primary-line",
                  )}
                >
                  {active && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel id={ids.categories} required valid={form.validity.categories} hint="Tối đa 3 danh mục.">
            Danh mục
          </FieldLabel>
          <CategoryPicker
            categories={categories}
            foodName={form.name}
            selectedIds={form.categoryIds}
            onSelectedChange={form.setCategoryIds}
            proposalName={form.proposalName}
            onProposalChange={form.setProposalName}
            labelledBy={ids.categories}
          />
        </div>
      </section>

      {/* Quán */}
      <section className={sectionClass} aria-labelledby="section-restaurant">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="section-restaurant" className="text-h4 text-text-primary">
            Quán bán món này
          </h2>
          {form.restaurantMode === "new" && (
            <button
              type="button"
              onClick={() => form.setRestaurantMode("existing")}
              className="inline-flex items-center gap-1.5 min-h-10 px-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Chọn quán có sẵn
            </button>
          )}
        </div>

        {form.restaurantMode === "existing" ? (
          <div className="flex flex-col gap-2">
            <FieldLabel id={ids.restaurant} required valid={form.validity.restaurant}>
              Quán
            </FieldLabel>
            <RestaurantPicker
              selected={form.selectedRestaurant}
              onSelect={form.pickExistingRestaurant}
              onCreateNew={form.startNewRestaurant}
              labelledBy={ids.restaurant}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor={ids.restaurantName} required valid={form.newRestaurantName.trim().length > 0}>
                Tên quán
              </FieldLabel>
              <input
                id={ids.restaurantName}
                value={form.newRestaurantName}
                maxLength={120}
                aria-required
                onChange={(event) => form.setNewRestaurantName(event.target.value)}
                placeholder="Vd: Hủ Tiếu Cô Ba"
                className={inputClass}
              />
            </div>

            <RestaurantLocationField
              location={form.location}
              addressInputId={ids.restaurantAddress}
              onPickExisting={form.pickExistingRestaurant}
            />

            <div className="flex flex-col gap-2">
              <FieldLabel
                id={ids.openingHours}
                required
                valid={form.validity.openingHours}
                hint="Có nghỉ trưa, mở qua đêm hay nghỉ ngày nào thì chọn “Chi tiết từng ngày”."
              >
                Giờ mở cửa
              </FieldLabel>
              <OpeningHoursField
                value={form.openingSchedule}
                onChange={form.setOpeningSchedule}
                showErrors={form.openingSchedule !== null}
                labelledBy={ids.openingHours}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel id={ids.restaurantImages} hint={`Tối đa ${MAX_RESTAURANT_IMAGES} ảnh mặt tiền/không gian quán.`}>
                Ảnh quán
              </FieldLabel>
              <ImageUploader
                uploads={form.restaurantImages}
                labelledBy={ids.restaurantImages}
                hint="Không bắt buộc — có ảnh thì người khác dễ nhận ra quán hơn."
                onOverflow={() => showToast(`Ảnh quán tối đa ${MAX_RESTAURANT_IMAGES} ảnh thôi nha.`, "warning")}
              />
            </div>
          </>
        )}

        <p className="flex items-start gap-1.5 text-xs text-text-secondary">
          <Sparkles className="size-3.5 shrink-0 mt-0.5 text-primary" aria-hidden />
          Món và quán mới sẽ chờ đội kiểm duyệt xác nhận trước khi hiện công khai.
        </p>
      </section>

      {form.error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {form.error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-sm sm:static sm:mx-0 sm:p-0 sm:bg-transparent sm:backdrop-blur-none flex sm:justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          aria-live="polite"
          className={cn(
            "w-full sm:w-auto min-w-64 h-12 px-6 rounded-2xl text-base font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
            canSubmit
              ? "bg-primary-strong text-white shadow-cta-dreamy hover:bg-primary-strong-hover active:scale-[0.98]"
              : "bg-primary-soft text-text-primary cursor-not-allowed",
          )}
        >
          {(form.isSubmitting || form.isUploading) && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

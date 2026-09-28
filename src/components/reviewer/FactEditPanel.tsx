"use client";

import { useId, useState } from "react";
import { ChevronDown, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { PinLocationEditor } from "@/components/map/PinLocationEditor";
import { formatPriceInput, parsePrice } from "@/features/contribute-food/formProgress";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import type { ReviewQueueItem } from "@/types/reviewer";

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

interface FactEditPanelProps {
  item: ReviewQueueItem;
  disabled: boolean;
  onSaved: (changes: Partial<ReviewQueueItem>) => void;
}

/**
 * Ngoại lệ BR-F08: FoodReviewer chỉnh ngay DỮ KIỆN THỰC TẾ của đóng góp đang chờ
 * duyệt — giá món; địa chỉ, vị trí, giờ mở cửa của quán. Tên, mô tả, ảnh, danh mục
 * thì dùng "Yêu cầu sửa". Server chặn các field khác (api/reviewer/contribution-edit).
 */
export function FactEditPanel({ item, disabled, onSaved }: FactEditPanelProps) {
  const { showToast } = useToast();
  const ids = { min: useId(), max: useId(), address: useId(), hours: useId() };
  const [open, setOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(item.priceMin !== null ? formatPriceInput(String(item.priceMin)) : "");
  const [priceMax, setPriceMax] = useState(item.priceMax !== null ? formatPriceInput(String(item.priceMax)) : "");
  const [address, setAddress] = useState(item.address ?? "");
  const [openingHours, setOpeningHours] = useState(item.openingHours ?? "");
  const [location, setLocation] = useState(item.location);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isFood = item.targetType === "food";
  const min = parsePrice(priceMin);
  const max = parsePrice(priceMax);
  const priceChanged = min !== item.priceMin || max !== item.priceMax;
  const restaurantChanges = {
    ...(address.trim() !== (item.address ?? "") && { address: address.trim() }),
    ...(openingHours.trim() !== (item.openingHours ?? "") && { openingHours: openingHours.trim() }),
    ...(JSON.stringify(location) !== JSON.stringify(item.location) && { location }),
  };
  const hasChanges = isFood ? priceChanged : Object.keys(restaurantChanges).length > 0;
  const valid = isFood ? min !== null && max !== null && max >= min : address.trim().length > 0;

  async function save() {
    if (!hasChanges || !valid) return;
    setIsSaving(true);
    try {
      const body = isFood
        ? { targetType: "food", targetId: item.id, note, food: { priceMin: min, priceMax: max } }
        : { targetType: "restaurant", targetId: item.id, note, restaurant: restaurantChanges };
      const response = await fetch("/api/reviewer/contribution-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        showToast(getApiErrorMessage(response.status, data.error), "error");
        return;
      }
      showToast("Đã chỉnh thông tin và báo cho người đóng góp.", "success");
      onSaved(
        isFood
          ? { priceMin: min, priceMax: max }
          : { address: address.trim(), openingHours: openingHours.trim() || null, location },
      );
      setNote("");
      setOpen(false);
    } catch {
      showToast(getNetworkErrorMessage(), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="w-full min-h-12 flex items-center gap-2 px-4 text-left text-sm font-semibold text-text-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded-2xl"
      >
        <PencilLine className="size-4 text-primary" aria-hidden />
        <span className="flex-1">Chỉnh dữ kiện thực tế</span>
        <span className="hidden sm:inline text-xs font-normal text-text-secondary">
          {isFood ? "giá" : "địa chỉ · vị trí · giờ mở cửa"}
        </span>
        <ChevronDown className={cn("size-4 text-text-secondary transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {isFood ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: ids.min, label: "Giá từ (đ)", value: priceMin, set: setPriceMin },
                { id: ids.max, label: "Đến (đ)", value: priceMax, set: setPriceMax },
              ].map((field) => (
                <div key={field.id} className="flex flex-col gap-1">
                  <label htmlFor={field.id} className="text-xs font-semibold text-text-primary">
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    inputMode="numeric"
                    value={field.value}
                    onChange={(event) => field.set(formatPriceInput(event.target.value))}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.address} className="text-xs font-semibold text-text-primary">
                  Địa chỉ
                </label>
                <input id={ids.address} value={address} maxLength={300} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.hours} className="text-xs font-semibold text-text-primary">
                  Giờ mở cửa
                </label>
                <input
                  id={ids.hours}
                  value={openingHours}
                  maxLength={100}
                  placeholder="Vd: 06:00 - 21:00"
                  onChange={(event) => setOpeningHours(event.target.value)}
                  className={inputClass}
                />
              </div>
              <PinLocationEditor initial={item.location} value={location} onChange={setLocation} />
            </>
          )}
          <textarea
            value={note}
            rows={2}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú lý do chỉnh (không bắt buộc, lưu vào nhật ký)"
            aria-label="Ghi chú lý do chỉnh"
            className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <p className="text-xs text-text-secondary">
            Tên, mô tả, ảnh và danh mục không sửa ở đây — hãy dùng “Yêu cầu sửa” để người gửi tự chỉnh.
          </p>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void save()} disabled={!hasChanges || !valid} isLoading={isSaving}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

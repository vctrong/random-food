"use client";

import Image from "next/image";
import { Check, Shuffle, Sparkles, UtensilsCrossed } from "lucide-react";
import type { Food } from "@/types/food";
import { formatPriceRange } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface SavedRandomModalProps {
  isOpen: boolean;
  food: Food | null;
  isRerolling: boolean;
  onConfirm: () => void;
  onReroll: () => void;
  onClose: () => void;
}

export function SavedRandomModal({
  isOpen,
  food,
  isRerolling,
  onConfirm,
  onReroll,
  onClose,
}: SavedRandomModalProps) {
  return (
    <Modal
      isOpen={isOpen && Boolean(food)}
      onClose={onClose}
      panelClassName="max-w-md p-6 flex flex-col items-center text-center"
    >
      {food && (
        <>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-4">
            <Sparkles className="size-3.5" aria-hidden />
            <span>KẾT QUẢ TỪ DANH SÁCH ĐÃ LƯU</span>
          </div>

          <div
            key={food.id}
            className={`w-28 h-28 rounded-full overflow-hidden shadow-lg mb-4 border-4 border-surface relative bg-primary-soft ${isRerolling ? "animate-pulse" : "animate-fade-slide-up"}`}
          >
            {food.images[0] ? (
              <Image
                src={food.images[0]}
                alt={`Ảnh minh hoạ ${food.name}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary">
                <UtensilsCrossed className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-1">{food.name}</h3>
          <p className="text-lg font-semibold text-primary mb-3">
            {food.priceMin !== null && food.priceMax !== null
              ? formatPriceRange(food.priceMin, food.priceMax)
              : "Chưa cập nhật giá"}
          </p>
          <p className="text-sm text-text-secondary max-w-xs mb-6">
            {food.restaurant
              ? `Món này có trong danh sách yêu thích của bạn tại ${food.restaurant.name}, ${food.restaurant.address}.`
              : "Món này có trong danh sách yêu thích của bạn."}
          </p>

          <div className="flex flex-col w-full gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full h-11 rounded-full bg-primary-strong text-white font-semibold shadow-md hover:bg-primary-strong-hover transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="size-4" aria-hidden />
              <span>Chốt ăn món này luôn</span>
            </button>
            <button
              type="button"
              onClick={onReroll}
              disabled={isRerolling}
              className="w-full h-11 rounded-full bg-primary-soft text-text-primary font-medium hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Shuffle className={isRerolling ? "size-4 animate-spin" : "size-4"} aria-hidden />
              <span>Random lại lần nữa</span>
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

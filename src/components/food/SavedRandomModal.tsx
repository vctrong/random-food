"use client";

import Image from "next/image";
import { Check, Shuffle, Sparkles, X } from "lucide-react";
import type { Food } from "@/types/food";
import { formatPriceRange } from "@/lib/utils";

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
  if (!isOpen || !food) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-soft-blue text-text-secondary hover:text-text-primary flex items-center justify-center"
        >
          <X className="size-4" aria-hidden />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue text-primary-blue text-xs font-semibold mb-4">
          <Sparkles className="size-3.5" aria-hidden />
          <span>KẾT QUẢ TỪ DANH SÁCH ĐÃ LƯU</span>
        </div>

        <div
          key={food.id}
          className={`w-28 h-28 rounded-full overflow-hidden shadow-lg mb-4 border-4 border-white relative ${isRerolling ? "animate-pulse" : "animate-fade-slide-up"}`}
        >
          <Image
            src={`https://picsum.photos/seed/${food.imageSeed}/224/224`}
            alt={`Ảnh minh hoạ ${food.name}`}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-1">{food.name}</h3>
        <p className="text-lg font-semibold text-primary-blue mb-3">
          {formatPriceRange(food.priceMin, food.priceMax)}
        </p>
        <p className="text-sm text-text-secondary max-w-xs mb-6">
          Món này có trong danh sách yêu thích của bạn tại {food.restaurantName}, {food.area}.
        </p>

        <div className="flex flex-col w-full gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full h-11 rounded-full bg-primary-blue text-white font-semibold shadow-md hover:bg-[#4a8ddb] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="size-4" aria-hidden />
            <span>Chốt ăn món này luôn</span>
          </button>
          <button
            type="button"
            onClick={onReroll}
            disabled={isRerolling}
            className="w-full h-11 rounded-full bg-soft-blue text-text-primary font-medium hover:bg-primary-blue/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Shuffle className={isRerolling ? "size-4 animate-spin" : "size-4"} aria-hidden />
            <span>Random lại lần nữa</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HelpCircle, Plus, UtensilsCrossed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

/**
 * Bong bóng tiện ích nổi góc phải màn hình trang món ăn: bấm mở ra 2 lựa chọn
 * nhanh — "Thêm món ăn" (điều hướng tới form đóng góp thật) và "Hỏi đáp" (UI
 * mẫu, chưa có nội dung FAQ thật — chỉ báo "sắp ra mắt" theo đúng yêu cầu).
 */
export function FoodQuickActionsBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div ref={containerRef} className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-3">
        <div
          className={cn(
            "flex flex-col items-end gap-3 transition-all duration-200 origin-bottom-right",
            isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-2 pointer-events-none",
          )}
        >
          <button
            type="button"
            onClick={() => {
              setIsFaqOpen(true);
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 pl-4 pr-2 h-12 rounded-full bg-surface shadow-lg border border-border hover:bg-soft-blue transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">Hỏi đáp</span>
            <span className="size-8 rounded-full bg-soft-blue text-primary-blue flex items-center justify-center shrink-0">
              <HelpCircle className="size-4.5" aria-hidden />
            </span>
          </button>

          <Link
            href="/mon-an/dong-gop"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 pl-4 pr-2 h-12 rounded-full bg-surface shadow-lg border border-border hover:bg-soft-pink transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">Thêm món ăn</span>
            <span className="size-8 rounded-full bg-soft-pink text-primary-pink flex items-center justify-center shrink-0">
              <UtensilsCrossed className="size-4.5" aria-hidden />
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Đóng bong bóng tiện ích" : "Mở bong bóng tiện ích"}
          aria-expanded={isOpen}
          className="size-14 rounded-full bg-primary-blue text-white shadow-[0_6px_20px_rgba(91,158,235,0.4)] hover:bg-[#4a8ddb] flex items-center justify-center transition-all active:scale-95"
        >
          <Plus className={cn("size-6 transition-transform duration-200", isOpen && "rotate-45")} aria-hidden />
        </button>
      </div>

      <Modal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} panelClassName="max-w-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-soft-blue text-primary-blue flex items-center justify-center mb-4">
          <HelpCircle className="size-6" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1.5">Hỏi đáp &amp; Hỗ trợ</h3>
        <p className="text-sm text-text-secondary">
          Tính năng Hỏi đáp đang được phát triển và sẽ sớm ra mắt để giải đáp thắc mắc nhanh cho bạn.
        </p>
        <button
          type="button"
          onClick={() => setIsFaqOpen(false)}
          className="mt-5 w-full h-11 rounded-full bg-soft-blue text-primary-blue font-semibold hover:bg-primary-blue hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <X className="size-4" aria-hidden />
          Đã hiểu
        </button>
      </Modal>
    </>
  );
}

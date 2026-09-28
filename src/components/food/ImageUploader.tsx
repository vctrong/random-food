"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, Camera, ChevronLeft, ChevronRight, ImagePlus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageUploads } from "@/features/contribute-food/useImageUploads";

interface ImageUploaderProps {
  uploads: ImageUploads;
  /** Mô tả ngắn cho vùng thả ảnh. */
  hint: string;
  labelledBy?: string;
  onOverflow?: (dropped: number) => void;
  required?: boolean;
}

/**
 * Chọn/kéo thả/chụp ảnh, xem trước, xoá, sắp xếp (kéo thả trên desktop, nút ←/→
 * cho bàn phím/màn hình cảm ứng). Ảnh đầu tiên là ảnh đại diện. Ảnh upload ngay
 * khi chọn — hiện tiến độ và lỗi từng ảnh.
 */
export function ImageUploader({ uploads, hint, labelledBy, onOverflow, required }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { items, max } = uploads;
  const canAdd = items.length < max;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const dropped = uploads.add(Array.from(files));
    if (dropped > 0) onOverflow?.(dropped);
  }

  function handleZoneDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    // Thả ảnh từ máy (không phải kéo sắp xếp trong danh sách).
    if (dragIndex === null && event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={labelledBy ? `${labelledBy}-hint` : undefined}
      onDragOver={(event) => {
        if (dragIndex !== null || !canAdd) return;
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleZoneDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed p-3 transition-colors",
        isDragOver ? "border-primary bg-primary-soft/60" : "border-border",
      )}
    >
      <p id={labelledBy ? `${labelledBy}-hint` : undefined} className="sr-only">
        {hint}
        {required ? " Bắt buộc ít nhất 1 ảnh." : ""}
      </p>
      <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {items.map((item, index) => (
          <li
            key={item.key}
            draggable={item.status !== "uploading"}
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              if (dragIndex !== index) {
                uploads.move(dragIndex, index);
                setDragIndex(index);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "group relative aspect-square rounded-xl overflow-hidden border border-border bg-background",
              dragIndex === index && "opacity-60 ring-2 ring-primary",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview cục bộ, next/image không hỗ trợ blob: URL */}
            <img src={item.previewUrl} alt={`Ảnh ${index + 1}${index === 0 ? " (ảnh đại diện)" : ""}`} className="size-full object-cover" />

            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold text-text-primary shadow-sm">
                Ảnh bìa
              </span>
            )}

            {item.status === "uploading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-end bg-text-primary/35 p-2">
                <span className="mb-1 text-xs font-bold text-white">{item.progress}%</span>
                <div className="h-1.5 w-full rounded-full bg-white/40 overflow-hidden" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Đang tải ảnh ${index + 1}`}>
                  <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            )}

            {item.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface/92 p-2 text-center">
                <AlertCircle className="size-4 text-accent-ink" aria-hidden />
                <span className="text-[11px] leading-tight text-text-primary line-clamp-2">{item.error}</span>
                <button
                  type="button"
                  onClick={() => uploads.retry(item.key)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  Thử lại
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => uploads.remove(item.key)}
              aria-label={`Xoá ảnh ${index + 1}`}
              className="absolute right-1 top-1 size-7 rounded-full bg-text-primary/65 text-white flex items-center justify-center hover:bg-text-primary/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>

            {items.length > 1 && item.status !== "uploading" && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => uploads.move(index, index - 1)}
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  className="size-7 rounded-full bg-surface/90 text-text-primary flex items-center justify-center shadow-sm disabled:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => uploads.move(index, index + 1)}
                  aria-label={`Đưa ảnh ${index + 1} ra sau`}
                  className="size-7 rounded-full bg-surface/90 text-text-primary flex items-center justify-center shadow-sm disabled:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}

        {canAdd && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="size-full rounded-xl bg-background text-text-secondary hover:text-primary hover:bg-primary-soft flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ImagePlus className="size-5" aria-hidden />
              <span className="text-xs font-semibold">Chọn ảnh</span>
              <span className="text-[10px]">
                {items.length}/{max}
              </span>
            </button>
          </li>
        )}
        {canAdd && (
          <li className="aspect-square sm:hidden">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="size-full rounded-xl bg-background text-text-secondary hover:text-primary hover:bg-primary-soft flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Camera className="size-5" aria-hidden />
              <span className="text-xs font-semibold">Chụp ảnh</span>
            </button>
          </li>
        )}
      </ul>

      <p className="mt-2.5 text-xs text-text-secondary">
        <span className="hidden sm:inline">Kéo thả ảnh vào đây hoặc bấm “Chọn ảnh”. </span>
        {hint}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- thumbnail ảnh cục bộ (blob:) / Cloudinary đã transform */
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  ImagePlus,
  Images,
  RefreshCw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { GalleryPreview } from "@/components/admin/GalleryPreview";
import { GalleryCropPanel } from "@/components/admin/GalleryCropPanel";
import { toGalleryImages, useGalleryDraft, type GalleryDraftItem } from "@/features/announcement-gallery/useGalleryDraft";
import { cloudinaryWidth } from "@/lib/media/cloudinaryUrl";
import { GALLERY_CLASSES, type GalleryImage } from "@/lib/media/galleryLayout";
import {
  ANNOUNCEMENT_IMAGE_SOURCE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_TYPE_LABEL,
  ANNOUNCEMENT_IMAGE_TYPES,
  ANNOUNCEMENT_LIMITS,
} from "@/constants/announcements";
import { cn } from "@/lib/utils";

const ITEM_DRAG_TYPE = "application/x-nayangi-gallery-item";
const ACCEPT = ANNOUNCEMENT_IMAGE_TYPES.join(",");
const SOURCE_MAX_MB = Math.round(ANNOUNCEMENT_IMAGE_SOURCE_MAX_BYTES / 1024 / 1024);

type CropTarget = { type: "add" } | { type: "replace"; key: string };

interface CropJob {
  id: string;
  file: File;
  target: CropTarget;
}

export interface GalleryModalResult {
  images: GalleryImage[];
  /** URL ảnh đã từng có trong modal (ban đầu hoặc vừa upload) nhưng không còn trong kết quả. */
  droppedSrcs: string[];
}

interface GalleryManagerModalProps {
  mode: "insert" | "edit";
  initialImages: GalleryImage[];
  /** URL ảnh đang nằm ở chỗ khác trong bài — để tính giới hạn tổng số ảnh. */
  otherImageSrcs: string[];
  onApply: (result: GalleryModalResult) => void;
  /** `uploadedSrcs`: ảnh upload trong phiên modal này, chưa từng vào bài. */
  onCancel: (uploadedSrcs: string[]) => void;
}

function isAcceptedType(type: string): boolean {
  return (ANNOUNCEMENT_IMAGE_TYPES as readonly string[]).includes(type);
}

function thumbSrc(item: GalleryDraftItem): string | null {
  if (item.localUrl && item.status !== "ready") return item.localUrl;
  return item.src ? cloudinaryWidth(item.src, 480) : item.localUrl;
}

/**
 * Modal "Bộ ảnh" của trình soạn thông báo: kéo-thả / chọn nhiều / dán ảnh, cắt ảnh
 * (tuỳ chọn) rồi upload ngầm ngay, xem trước đúng bố cục khi đăng, sửa alt, thay,
 * xoá (có xác nhận), sắp xếp bằng kéo-thả hoặc nút ←/→. Giới hạn 20 ảnh/bài.
 */
export function GalleryManagerModal({ mode, initialImages, otherImageSrcs, onApply, onCancel }: GalleryManagerModalProps) {
  const { showToast } = useToast();
  const titleId = useId();
  const draft = useGalleryDraft(initialImages);
  const { items } = draft;
  const reduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceKeyRef = useRef<string | null>(null);
  const [cropQueue, setCropQueue] = useState<CropJob[]>([]);
  const [cropDone, setCropDone] = useState(0);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const initialSrcs = new Set(initialImages.map((image) => image.src));
  const readySrcs = items.map((item) => item.src).filter((src): src is string => src !== null);
  const pendingCount = items.filter((item) => item.src === null).length;
  const queuedAdds = cropQueue.filter((job) => job.target.type === "add").length;
  const totalImages = new Set([...otherImageSrcs, ...readySrcs]).size + pendingCount;
  const room = Math.max(0, ANNOUNCEMENT_LIMITS.imagesMax - totalImages - queuedAdds);
  const isFull = room === 0;
  const isCropping = cropQueue.length > 0;

  const uploadedNotInitial = draft.uploadedInSession.filter((src) => !initialSrcs.has(src));
  const isDirty =
    uploadedNotInitial.length > 0 ||
    items.length !== initialImages.length ||
    items.some((item, index) => item.src !== initialImages[index]?.src || item.alt !== (initialImages[index]?.alt ?? ""));

  function acceptFiles(files: File[], target: CropTarget) {
    const problems: string[] = [];
    let valid = files.filter((file) => {
      if (!isAcceptedType(file.type)) {
        problems.push(`“${file.name}” không đúng định dạng (${ANNOUNCEMENT_IMAGE_TYPE_LABEL}).`);
        return false;
      }
      if (file.size > ANNOUNCEMENT_IMAGE_SOURCE_MAX_BYTES) {
        problems.push(`“${file.name}” nặng quá ${SOURCE_MAX_MB}MB.`);
        return false;
      }
      return true;
    });
    if (target.type === "add" && valid.length > room) {
      problems.push(
        room === 0
          ? `Bài đã đủ ${ANNOUNCEMENT_LIMITS.imagesMax} ảnh.`
          : `Chỉ thêm được ${room} ảnh nữa (tối đa ${ANNOUNCEMENT_LIMITS.imagesMax} ảnh/bài) — đã bỏ ${valid.length - room} ảnh.`,
      );
      valid = valid.slice(0, room);
    }
    if (problems.length > 0) showToast(problems.slice(0, 3).join(" "), "warning");
    if (valid.length === 0) return;

    // GIF cắt bằng canvas sẽ mất chuyển động → không qua bước cắt.
    const jobs: CropJob[] = [];
    for (const file of valid) {
      if (file.type === "image/gif") commitFile(file, target);
      else jobs.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, target });
    }
    if (jobs.length > 0) {
      if (cropQueue.length === 0) setCropDone(0);
      setCropQueue((queue) => [...queue, ...jobs]);
    }
  }

  function commitFile(file: File, target: CropTarget) {
    if (target.type === "replace" && items.some((item) => item.key === target.key)) draft.replace(target.key, file);
    else draft.add(file);
  }

  function finishCropJob(job: CropJob, file: File | null) {
    if (file) commitFile(file, job.target);
    setCropDone((value) => value + 1);
    setCropQueue((queue) => queue.filter((item) => item.id !== job.id));
  }

  function skipAllCrops() {
    cropQueue.forEach((job) => commitFile(job.file, job.target));
    setCropQueue([]);
  }

  // Dán ảnh từ clipboard (Ctrl/⌘+V) khi modal đang mở — chữ dán vào ô alt vẫn bình thường.
  const acceptFilesRef = useRef(acceptFiles);
  useEffect(() => {
    acceptFilesRef.current = acceptFiles;
  });
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;
      event.preventDefault();
      acceptFilesRef.current(files, { type: "add" });
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function requestClose() {
    if (isCropping) {
      setCropQueue([]);
      return;
    }
    if (pendingDeleteKey) {
      setPendingDeleteKey(null);
      return;
    }
    if (isConfirmingClose || !isDirty) {
      onCancel(uploadedNotInitial);
      return;
    }
    setIsConfirmingClose(true);
  }

  function apply() {
    if (draft.isUploading) {
      showToast("Đợi ảnh tải lên xong đã nha.", "warning");
      return;
    }
    if (draft.hasError) {
      showToast("Còn ảnh tải lỗi — bấm “Thử lại” hoặc xoá ảnh đó.", "warning");
      return;
    }
    const images = toGalleryImages(items);
    const finalSrcs = new Set(images.map((image) => image.src));
    const everSeen = new Set([...initialSrcs, ...draft.uploadedInSession]);
    onApply({ images, droppedSrcs: [...everSeen].filter((src) => !finalSrcs.has(src)) });
  }

  /* ---------- kéo-thả: file từ máy (thêm ảnh) và thẻ ảnh (sắp xếp) ---------- */

  function isFileDrag(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleBodyDragOver(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isFull ? "none" : "copy";
    setIsFileDragOver(true);
  }

  function handleBodyDrop(event: DragEvent) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsFileDragOver(false);
    acceptFiles(Array.from(event.dataTransfer.files), { type: "add" });
  }

  function handleItemDrop(event: DragEvent, index: number) {
    const key = event.dataTransfer.getData(ITEM_DRAG_TYPE);
    if (!key) return;
    event.preventDefault();
    event.stopPropagation();
    const from = items.findIndex((item) => item.key === key);
    if (from >= 0) draft.move(from, index);
    setDraggingKey(null);
    setDropIndex(null);
  }

  const applyLabel = mode === "insert" ? "Chèn bộ ảnh" : items.length === 0 ? "Gỡ bộ ảnh khỏi bài" : "Cập nhật bộ ảnh";
  const currentJob = cropQueue[0];

  return (
    <Modal
      isOpen
      onClose={requestClose}
      labelledBy={titleId}
      panelClassName="flex h-[92svh] max-w-5xl flex-col overflow-hidden"
    >
      {currentJob ? (
        <GalleryCropPanel
          key={currentJob.id}
          file={currentJob.file}
          queueLabel={cropQueue.length + cropDone > 1 ? `${cropDone + 1}/${cropQueue.length + cropDone}` : null}
          hasMoreInQueue={cropQueue.length > 1}
          onApply={(file) => finishCropJob(currentJob, file)}
          onDiscard={() => finishCropJob(currentJob, null)}
          onSkipAll={skipAllCrops}
        />
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 pr-16">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Images className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-h4 text-text-primary">
                {mode === "insert" ? "Thêm bộ ảnh" : "Sửa bộ ảnh"}
              </h2>
              <p className="text-xs text-text-secondary">1 ảnh hiện nguyên tỉ lệ · 2 ảnh trở lên xếp lưới · bấm ảnh trong bài để xem lớn.</p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
                isFull ? "bg-accent-soft text-accent-ink" : "bg-primary-soft text-primary-strong dark:text-primary",
              )}
              aria-label={`Đã dùng ${totalImages} trên ${ANNOUNCEMENT_LIMITS.imagesMax} ảnh của bài`}
            >
              {totalImages}/{ANNOUNCEMENT_LIMITS.imagesMax}
            </span>
          </header>

          <div
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5"
            onDragOver={handleBodyDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFileDragOver(false);
            }}
            onDrop={handleBodyDrop}
          >
            {items.length > 0 && (
              <section aria-label="Xem trước">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Xem trước — giống khi đăng</p>
                <div className="mx-auto max-w-[720px]">
                  <GalleryPreview items={items} />
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFull}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                items.length === 0 ? "py-20" : "py-8",
                isFull
                  ? "cursor-not-allowed border-border bg-background opacity-60"
                  : isFileDragOver
                    ? "border-primary bg-primary-soft"
                    : "border-primary-line bg-primary-soft/40 hover:border-primary hover:bg-primary-soft",
              )}
            >
              <span className="grid size-12 place-items-center rounded-full bg-surface text-primary shadow-sm">
                <ImagePlus className="size-6" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {isFull
                  ? `Đã đủ ${ANNOUNCEMENT_LIMITS.imagesMax} ảnh cho bài này`
                  : isFileDragOver
                    ? "Thả ảnh vào đây"
                    : "Kéo-thả ảnh vào đây, dán (Ctrl+V) hoặc bấm để chọn nhiều ảnh"}
              </span>
              <span className="text-xs text-text-secondary">
                {ANNOUNCEMENT_IMAGE_TYPE_LABEL} · tối đa {SOURCE_MAX_MB}MB/ảnh (tự nén về ≤ 5MB) · còn {room} chỗ
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(event) => {
                acceptFiles(Array.from(event.target.files ?? []), { type: "add" });
                event.target.value = "";
              }}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                const key = replaceKeyRef.current;
                if (file && key) acceptFiles([file], { type: "replace", key });
                event.target.value = "";
              }}
            />

            {items.length > 0 && (
              <section aria-label="Danh sách ảnh">
                <p className="mb-2 text-xs text-text-secondary">Kéo thẻ ảnh để đổi thứ tự (hoặc dùng nút ← →). Ảnh đầu tiên là ảnh lớn nhất.</p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, index) => {
                    const src = thumbSrc(item);
                    const isConfirmingDelete = pendingDeleteKey === item.key;
                    return (
                      <motion.li key={item.key} layout={!reduceMotion} transition={{ duration: 0.2, ease: "easeOut" }}>
                        <div
                          draggable={!isConfirmingDelete}
                          onDragStart={(event) => {
                            event.dataTransfer.setData(ITEM_DRAG_TYPE, item.key);
                            event.dataTransfer.effectAllowed = "move";
                            setDraggingKey(item.key);
                          }}
                          onDragEnd={() => {
                            setDraggingKey(null);
                            setDropIndex(null);
                          }}
                          onDragOver={(event) => {
                            if (!draggingKey) return;
                            event.preventDefault();
                            event.stopPropagation();
                            setDropIndex(index);
                          }}
                          onDrop={(event) => handleItemDrop(event, index)}
                          className={cn(
                            "overflow-hidden rounded-2xl border bg-surface transition-[opacity,box-shadow,border-color]",
                            draggingKey === item.key ? "opacity-40" : "opacity-100",
                            dropIndex === index && draggingKey && draggingKey !== item.key
                              ? "border-primary ring-2 ring-primary/40"
                              : "border-border",
                          )}
                        >
                          <div className={cn("relative aspect-[4/3]", item.transparent ? GALLERY_CLASSES.transparentBackdrop : "bg-background")}>
                            {src && <img src={src} alt="" className="size-full object-cover" draggable={false} />}
                            <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold text-text-primary shadow-sm tabular-nums">
                              {index + 1}
                            </span>
                            <span className="absolute right-2 top-2 grid size-7 cursor-grab place-items-center rounded-lg bg-surface/90 text-text-secondary shadow-sm active:cursor-grabbing">
                              <GripVertical className="size-4" aria-hidden />
                            </span>

                            {item.status === "uploading" && (
                              <div className="absolute inset-x-0 bottom-0 bg-surface/85 px-3 py-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                                  <span>Đang tải lên</span>
                                  <span className="tabular-nums">{item.progress}%</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary-soft">
                                  <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                                </div>
                              </div>
                            )}

                            {item.status === "error" && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/90 p-3 text-center">
                                <AlertCircle className="size-5 text-accent-ink" aria-hidden />
                                <p className="text-xs text-text-primary">{item.error}</p>
                                <Button size="sm" variant="outline" onClick={() => draft.retry(item.key)} leftIcon={<RotateCw className="size-3.5" />}>
                                  Thử lại
                                </Button>
                              </div>
                            )}

                            {isConfirmingDelete && (
                              <div
                                role="alertdialog"
                                aria-label={`Xác nhận xoá ảnh ${index + 1}`}
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/95 p-3 text-center"
                              >
                                <p className="text-sm font-semibold text-text-primary">Xoá ảnh này khỏi bộ ảnh?</p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    autoFocus
                                    onClick={() => {
                                      draft.remove(item.key);
                                      setPendingDeleteKey(null);
                                    }}
                                    className="h-9 rounded-full bg-accent-strong px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    Xoá
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteKey(null)}
                                    className="h-9 rounded-full border border-border px-4 text-sm font-semibold text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    Huỷ
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 p-3">
                            <input
                              value={item.alt}
                              maxLength={ANNOUNCEMENT_LIMITS.imageAltMax}
                              onChange={(event) => draft.setAlt(item.key, event.target.value)}
                              aria-label={`Chú thích ảnh ${index + 1}`}
                              placeholder="Chú thích / mô tả ảnh (alt)"
                              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                            />
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex gap-1">
                                <IconAction label="Đưa ảnh lên trước" disabled={index === 0} onClick={() => draft.move(index, index - 1)}>
                                  <ArrowLeft className="size-4" aria-hidden />
                                </IconAction>
                                <IconAction
                                  label="Đưa ảnh ra sau"
                                  disabled={index === items.length - 1}
                                  onClick={() => draft.move(index, index + 1)}
                                >
                                  <ArrowRight className="size-4" aria-hidden />
                                </IconAction>
                              </div>
                              <div className="flex gap-1">
                                <IconAction
                                  label="Thay ảnh"
                                  disabled={item.status === "uploading"}
                                  onClick={() => {
                                    replaceKeyRef.current = item.key;
                                    replaceInputRef.current?.click();
                                  }}
                                >
                                  <RefreshCw className="size-4" aria-hidden />
                                </IconAction>
                                <IconAction label="Xoá ảnh" tone="danger" onClick={() => setPendingDeleteKey(item.key)}>
                                  <Trash2 className="size-4" aria-hidden />
                                </IconAction>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            {isConfirmingClose ? (
              <>
                <p className="text-sm text-text-primary">Đóng mà không lưu? Ảnh vừa tải lên trong lần này sẽ bị xoá.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsConfirmingClose(false)}>
                    Ở lại
                  </Button>
                  <Button size="sm" className="!bg-accent-strong hover:!bg-accent-strong-hover" onClick={requestClose}>
                    Đóng, bỏ thay đổi
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-text-secondary" aria-live="polite">
                  {draft.isUploading
                    ? "Đang tải ảnh lên…"
                    : draft.hasError
                      ? "Có ảnh tải lỗi — thử lại hoặc xoá."
                      : `${items.length} ảnh trong bộ này`}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={requestClose}>
                    Huỷ
                  </Button>
                  <Button
                    size="sm"
                    onClick={apply}
                    disabled={draft.isUploading || (mode === "insert" && items.length === 0)}
                    leftIcon={<Images className="size-4" />}
                  >
                    {applyLabel}
                  </Button>
                </div>
              </>
            )}
          </footer>
        </>
      )}
    </Modal>
  );
}

function IconAction({
  label,
  onClick,
  disabled = false,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-35",
        tone === "danger" ? "hover:bg-accent-soft hover:text-accent-ink" : "hover:bg-primary-soft hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

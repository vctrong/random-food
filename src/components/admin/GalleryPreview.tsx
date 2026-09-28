"use client";

/* eslint-disable @next/next/no-img-element -- xem trước ảnh cục bộ (blob:) và ảnh Cloudinary đã transform, giống HTML bài đăng */
import { GALLERY_CLASSES, GALLERY_VISIBLE_MAX, galleryLayout } from "@/lib/media/galleryLayout";
import { cloudinaryTiny, cloudinaryWidth } from "@/lib/media/cloudinaryUrl";
import { cn } from "@/lib/utils";
import type { GalleryDraftItem } from "@/features/announcement-gallery/useGalleryDraft";

function displaySrc(item: GalleryDraftItem, width: number): string | null {
  if (item.localUrl && item.status !== "ready") return item.localUrl;
  if (item.src) return cloudinaryWidth(item.src, width);
  return item.localUrl;
}

function UploadOverlay({ item }: { item: GalleryDraftItem }) {
  if (item.status === "ready") return null;
  return (
    <span
      className={cn(
        "absolute inset-x-3 bottom-3 rounded-full px-2.5 py-1 text-center text-xs font-semibold shadow-sm",
        item.status === "error" ? "bg-accent-strong text-white" : "bg-surface/90 text-text-primary",
      )}
    >
      {item.status === "error" ? "Lỗi tải ảnh" : `Đang tải ${item.progress}%`}
    </span>
  );
}

/**
 * Xem trước bộ ảnh ĐÚNG bố cục khi đăng (cùng class với lib/announcementGallery.ts),
 * khác mỗi chỗ ảnh đang upload hiện bản cục bộ + tiến độ.
 */
export function GalleryPreview({ items }: { items: GalleryDraftItem[] }) {
  if (items.length === 0) return null;

  if (items.length === 1) {
    const item = items[0];
    const src = displaySrc(item, 1200);
    return (
      <figure className="my-0">
        <div className={cn(GALLERY_CLASSES.singleFrame, item.transparent && GALLERY_CLASSES.transparentBackdrop)}>
          {src && !item.transparent && (
            <img
              src={item.src && item.status === "ready" ? cloudinaryTiny(item.src) : src}
              alt=""
              aria-hidden
              className={GALLERY_CLASSES.singleBackdrop}
            />
          )}
          {src ? (
            <img
              src={src}
              alt={item.alt}
              width={item.width ?? undefined}
              height={item.height ?? undefined}
              className={GALLERY_CLASSES.singleImage}
            />
          ) : (
            <div className="aspect-[4/3]" />
          )}
          <UploadOverlay item={item} />
        </div>
      </figure>
    );
  }

  const layout = galleryLayout(items.length);
  return (
    <figure className="my-0">
      <div className={cn(GALLERY_CLASSES.grid, layout.gridClass)}>
        {items.slice(0, GALLERY_VISIBLE_MAX).map((item, index) => {
          const src = displaySrc(item, 800);
          const isMoreCell = layout.hiddenCount > 0 && index === GALLERY_VISIBLE_MAX - 1;
          return (
            <div key={item.key} className={cn(GALLERY_CLASSES.cell, layout.cellClasses[index], item.transparent && GALLERY_CLASSES.transparentBackdrop)}>
              {src && <img src={src} alt={item.alt} className={GALLERY_CLASSES.cellImage} />}
              {isMoreCell ? <span className={GALLERY_CLASSES.more}>+{layout.hiddenCount}</span> : <UploadOverlay item={item} />}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

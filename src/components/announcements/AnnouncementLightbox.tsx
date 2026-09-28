"use client";

import { useEffect, useState } from "react";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import { parseGalleryImagesAttr } from "@/lib/media/galleryLayout";

/**
 * Gắn lightbox vào nội dung bài (HTML render sẵn ở server): bấm ô trong bộ ảnh
 * (figure[data-gallery]) → mở đúng ảnh đó với đủ danh sách từ `data-images`;
 * bấm ảnh lẻ kiểu cũ → mở riêng ảnh đó. Ctrl/⌘+click vẫn mở ảnh ở tab mới.
 */
export function AnnouncementLightbox({ containerId }: { containerId: string }) {
  const [state, setState] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[data-gallery-item]");
      if (link && container.contains(link)) {
        const images = parseGalleryImagesAttr(link.closest("figure[data-gallery]")?.getAttribute("data-images") ?? null);
        if (images.length === 0) return;
        event.preventDefault();
        const index = Number(link.dataset.galleryItem);
        setState({
          items: images.map(({ src, alt }) => ({ src, alt })),
          index: Number.isInteger(index) ? Math.min(Math.max(index, 0), images.length - 1) : 0,
        });
        return;
      }
      const image = target?.closest("img");
      if (image && image.parentElement === container && image.getAttribute("src")) {
        setState({ items: [{ src: image.getAttribute("src") as string, alt: image.alt || null }], index: 0 });
      }
    };
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerId]);

  if (!state) return null;
  return <Lightbox items={state.items} startIndex={state.index} onClose={() => setState(null)} />;
}

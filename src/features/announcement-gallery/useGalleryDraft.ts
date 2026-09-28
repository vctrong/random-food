"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImageAsset, UploadError } from "@/services/uploadService";
import type { GalleryImage } from "@/lib/media/galleryLayout";

export interface GalleryDraftItem {
  key: string;
  /** URL Cloudinary — null khi đang upload / lỗi. */
  src: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  transparent: boolean;
  /** Ảnh cục bộ (object URL) để xem trước trong lúc upload. */
  localUrl: string | null;
  status: "ready" | "uploading" | "error";
  progress: number;
  error: string | null;
  /** Giữ file để "Thử lại". */
  file: File | null;
}

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fromImage(image: GalleryImage): GalleryDraftItem {
  return {
    key: newKey(),
    src: image.src,
    alt: image.alt ?? "",
    width: image.width,
    height: image.height,
    transparent: image.transparent === true,
    localUrl: null,
    status: "ready",
    progress: 100,
    error: null,
    file: null,
  };
}

/**
 * Trạng thái modal "Bộ ảnh": ảnh upload ngầm ngay khi thêm (tiến độ, lỗi + thử lại),
 * thay ảnh, sửa alt, sắp xếp. Ghi lại mọi URL đã upload trong phiên để modal biết
 * ảnh nào cần xoá khỏi Cloudinary khi huỷ / bỏ ảnh.
 */
export function useGalleryDraft(initialImages: GalleryImage[]) {
  const [items, setItems] = useState<GalleryDraftItem[]>(() => initialImages.map(fromImage));
  const controllers = useRef(new Map<string, AbortController>());
  const [uploadedInSession, setUploadedInSession] = useState<string[]>([]);
  const localUrls = useRef(new Set<string>());

  useEffect(() => {
    const activeControllers = controllers.current;
    const activeUrls = localUrls.current;
    return () => {
      activeControllers.forEach((controller) => controller.abort());
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const patch = useCallback((key: string, changes: Partial<GalleryDraftItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }, []);

  const startUpload = useCallback(
    (key: string, file: File) => {
      controllers.current.get(key)?.abort();
      const controller = new AbortController();
      controllers.current.set(key, controller);
      patch(key, { status: "uploading", progress: 0, error: null });
      uploadImageAsset(file, "announcement", { signal: controller.signal, onProgress: (progress) => patch(key, { progress }) })
        .then((uploaded) => {
          setUploadedInSession((prev) => [...prev, uploaded.url]);
          patch(key, {
            status: "ready",
            progress: 100,
            src: uploaded.url,
            width: uploaded.width,
            height: uploaded.height,
            transparent: uploaded.transparent,
            file: null,
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          patch(key, {
            status: "error",
            error: error instanceof UploadError ? error.message : "Tải ảnh lên thất bại, thử lại nha.",
          });
        })
        .finally(() => {
          if (controllers.current.get(key) === controller) controllers.current.delete(key);
        });
    },
    [patch],
  );

  function makeLocalUrl(file: File): string {
    const url = URL.createObjectURL(file);
    localUrls.current.add(url);
    return url;
  }

  /** Thêm ảnh mới vào cuối và upload ngay. */
  const add = useCallback(
    (file: File) => {
      const key = newKey();
      const item: GalleryDraftItem = {
        key,
        src: null,
        alt: "",
        width: null,
        height: null,
        transparent: false,
        localUrl: makeLocalUrl(file),
        status: "uploading",
        progress: 0,
        error: null,
        file,
      };
      setItems((prev) => [...prev, item]);
      startUpload(key, file);
    },
    [startUpload],
  );

  /** Thay ảnh tại chỗ (giữ vị trí + alt); ảnh cũ do modal quyết định xoá hay giữ. */
  const replace = useCallback(
    (key: string, file: File) => {
      patch(key, { src: null, width: null, height: null, transparent: false, localUrl: makeLocalUrl(file), file });
      startUpload(key, file);
    },
    [patch, startUpload],
  );

  const retry = useCallback(
    (key: string) => {
      const file = items.find((item) => item.key === key)?.file;
      if (file) startUpload(key, file);
    },
    [items, startUpload],
  );

  const remove = useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setItems((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const setAlt = useCallback((key: string, alt: string) => patch(key, { alt }), [patch]);

  return {
    items,
    add,
    replace,
    retry,
    remove,
    move,
    setAlt,
    isUploading: items.some((item) => item.status === "uploading"),
    hasError: items.some((item) => item.status === "error"),
    /** Mọi URL đã upload xong trong phiên modal này (kể cả ảnh sau đó bị xoá/thay). */
    uploadedInSession,
  };
}

export function toGalleryImages(items: GalleryDraftItem[]): GalleryImage[] {
  return items
    .filter((item): item is GalleryDraftItem & { src: string } => item.status === "ready" && item.src !== null)
    .map((item) => ({
      src: item.src,
      alt: item.alt.trim() || null,
      width: item.width,
      height: item.height,
      ...(item.transparent && { transparent: true }),
    }));
}

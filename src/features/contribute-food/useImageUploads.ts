"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImage, UploadError, type UploadKind } from "@/services/uploadService";

export interface UploadItem {
  key: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  progress: number;
  url: string | null;
  error: string | null;
}

export interface ImageUploads {
  items: UploadItem[];
  max: number;
  /** Thêm ảnh; trả số ảnh bị bỏ vì vượt giới hạn. */
  add: (files: File[]) => number;
  remove: (key: string) => void;
  move: (from: number, to: number) => void;
  retry: (key: string) => void;
  /** URL Cloudinary đã upload xong, theo đúng thứ tự hiển thị. */
  urls: string[];
  isUploading: boolean;
  hasError: boolean;
}

/**
 * Quản lý danh sách ảnh upload ngay khi chọn (không chờ bấm gửi): tiến độ từng
 * ảnh, lỗi + thử lại, xoá, sắp xếp. Xoá ảnh đang upload thì huỷ request.
 */
export function useImageUploads(kind: UploadKind, max: number): ImageUploads {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const activeControllers = controllers.current;
    return () => {
      activeControllers.forEach((controller) => controller.abort());
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }, []);

  const start = useCallback(
    (key: string, file: File) => {
      const controller = new AbortController();
      controllers.current.set(key, controller);
      patch(key, { status: "uploading", progress: 0, error: null });
      uploadImage(file, kind, { signal: controller.signal, onProgress: (progress) => patch(key, { progress }) })
        .then((url) => patch(key, { status: "done", progress: 100, url }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          patch(key, {
            status: "error",
            error: error instanceof UploadError ? error.message : "Tải ảnh lên thất bại, thử lại nha.",
          });
        })
        .finally(() => controllers.current.delete(key));
    },
    [kind, patch],
  );

  const add = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      const room = Math.max(0, max - itemsRef.current.length);
      const accepted = images.slice(0, room);
      const created = accepted.map((file) => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading" as const,
        progress: 0,
        url: null,
        error: null,
      }));
      if (created.length > 0) {
        setItems((prev) => [...prev, ...created]);
        created.forEach((item) => start(item.key, item.file));
      }
      return images.length - accepted.length;
    },
    [max, start],
  );

  const remove = useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    setItems((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
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

  const retry = useCallback(
    (key: string) => {
      const target = itemsRef.current.find((item) => item.key === key);
      if (target) start(key, target.file);
    },
    [start],
  );

  return {
    items,
    max,
    add,
    remove,
    move,
    retry,
    urls: items.filter((item) => item.status === "done" && item.url).map((item) => item.url as string),
    isUploading: items.some((item) => item.status === "uploading"),
    hasError: items.some((item) => item.status === "error"),
  };
}

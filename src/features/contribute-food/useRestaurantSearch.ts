"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRestaurantPage } from "@/services/restaurantService";
import type { RestaurantOption } from "@/types/restaurant";

const DEBOUNCE_MS = 300;

/**
 * Tìm/liệt kê quán cho RestaurantPicker: debounce 300ms, huỷ request cũ khi gõ
 * tiếp (AbortController), infinite scroll theo cursor. Chỉ chạy khi `enabled`
 * (picker đang mở) để không gọi API thừa.
 */
export function useRestaurantSearch(enabled: boolean, near: { lat: number; lng: number } | null) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<RestaurantOption[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const nearKey = near ? `${near.lat.toFixed(4)},${near.lng.toFixed(4)}` : "";

  useEffect(() => {
    if (!enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // Trang đầu mới (đổi từ khoá / vị trí / thử lại) — hiện skeleton, giữ kết quả cũ tới khi có kết quả mới.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    fetchRestaurantPage({ q: debouncedQuery, cursor: null, near }, controller.signal)
      .then((page) => {
        setItems(page.items);
        setCursor(page.nextCursor);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setItems([]);
        setCursor(null);
        setStatus("error");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `near` so sánh qua nearKey
  }, [enabled, debouncedQuery, nearKey, reloadKey]);

  const loadMore = useCallback(() => {
    if (!cursor || isLoadingMore || status !== "ready") return;
    const controller = controllerRef.current;
    setIsLoadingMore(true);
    fetchRestaurantPage({ q: debouncedQuery, cursor, near }, controller?.signal)
      .then((page) => {
        setItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...page.items.filter((item) => !seen.has(item.id))];
        });
        setCursor(page.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setIsLoadingMore(false));
  }, [cursor, isLoadingMore, status, debouncedQuery, near]);

  return {
    query,
    setQuery,
    /** Từ khoá đã áp dụng (sau debounce) — dùng để tô đậm đúng với kết quả đang hiện. */
    appliedQuery: debouncedQuery,
    items,
    status: query !== debouncedQuery && items.length > 0 ? ("loading" as const) : status,
    hasMore: Boolean(cursor),
    isLoadingMore,
    loadMore,
    retry: () => setReloadKey((key) => key + 1),
  };
}

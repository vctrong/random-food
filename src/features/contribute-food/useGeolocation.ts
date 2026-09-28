"use client";

import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "locating" | "ready" | "denied" | "unavailable";

export interface GeoPoint {
  lat: number;
  lng: number;
}

const ERROR_MESSAGES: Record<"denied" | "unavailable", string> = {
  denied: "Bạn chưa cho phép truy cập vị trí. Bật quyền vị trí cho trang này trong trình duyệt rồi thử lại nha.",
  unavailable: "Không lấy được vị trí lúc này, thử lại hoặc ghim tay trên bản đồ nha.",
};

/**
 * Lấy vị trí hiện tại. `request()` chỉ gọi khi user bấm nút (không tự bật hộp
 * xin quyền); `requestIfGranted()` lấy âm thầm nếu user ĐÃ cho quyền từ trước.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [position, setPosition] = useState<GeoPoint | null>(null);

  const request = useCallback((): Promise<GeoPoint | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }
    setStatus("locating");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          const point = { lat: result.coords.latitude, lng: result.coords.longitude };
          setPosition(point);
          setStatus("ready");
          resolve(point);
        },
        (error) => {
          setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }, []);

  const requestIfGranted = useCallback(async (): Promise<GeoPoint | null> => {
    try {
      const permission = await navigator.permissions?.query({ name: "geolocation" });
      if (permission?.state !== "granted") return null;
      return request();
    } catch {
      return null;
    }
  }, [request]);

  return {
    status,
    position,
    request,
    requestIfGranted,
    errorMessage: status === "denied" || status === "unavailable" ? ERROR_MESSAGES[status] : null,
  };
}

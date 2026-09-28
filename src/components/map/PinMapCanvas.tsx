"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { cn } from "@/lib/utils";
import type { RestaurantOption } from "@/types/restaurant";

export interface PinMapCanvasProps {
  /** Tâm mong muốn — chỉ áp dụng khi `moveKey` đổi (di chuyển do code: geocode, GPS…). */
  center: { lat: number; lng: number };
  moveKey: number;
  zoom?: number;
  interactive: boolean;
  nearby?: RestaurantOption[];
  highlightedId?: string | null;
  /** Chưa ghim — ghim hiển thị mờ để không bị hiểu nhầm là đã chọn vị trí. */
  pinMuted?: boolean;
  /** User tự kéo bản đồ xong (không gọi khi code di chuyển map). */
  onUserMoveEnd?: (center: { lat: number; lng: number }) => void;
  onSelectNearby?: (id: string) => void;
}

function nearbyIcon(active: boolean) {
  return L.divIcon({
    html: `<span style="display:block;width:${active ? 18 : 14}px;height:${active ? 18 : 14}px;border-radius:9999px;background:var(--color-primary-strong);border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / .35)"></span>`,
    className: "",
    iconSize: active ? [18, 18] : [14, 14],
    iconAnchor: active ? [9, 9] : [7, 7],
  });
}

const sameCenter = (a: L.LatLng, b: { lat: number; lng: number }) =>
  Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;

/**
 * Bản đồ chọn vị trí kiểu "ghim cố định giữa màn hình": user kéo map chứ không
 * kéo ghim, zoom luôn quanh tâm để không làm lệch vị trí đang ghim. Leaflet API
 * thuần + tự quản vòng đời (cùng lý do với LeafletMap.tsx). Phải import động ssr:false.
 */
export default function PinMapCanvas({
  center,
  moveKey,
  zoom = 15,
  interactive,
  nearby = [],
  highlightedId = null,
  pinMuted = false,
  onUserMoveEnd,
  onSelectNearby,
}: PinMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const programmaticRef = useRef(false);
  const callbacksRef = useRef({ onUserMoveEnd, onSelectNearby });
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onUserMoveEnd, onSelectNearby };
  }, [onUserMoveEnd, onSelectNearby]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number };
    if (leafletContainer._leaflet_id) delete leafletContainer._leaflet_id;

    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom,
      maxZoom: 19,
      zoomControl: false,
      // Zoom quanh TÂM để ghim giữa không trượt khỏi vị trí đã chọn.
      scrollWheelZoom: "center",
      doubleClickZoom: "center",
      touchZoom: "center",
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    // Ảnh vệ tinh Esri (không cần API key) — dễ nhận ra mái nhà/ngõ khi chỉnh ghim.
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics" },
    );
    L.control.layers({ "Đường phố": street, "Vệ tinh": satellite }, undefined, { position: "topright" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);

    map.on("movestart", () => setIsMoving(true));
    map.on("dragstart", () => {
      programmaticRef.current = false;
    });
    map.on("moveend", () => {
      setIsMoving(false);
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      const current = map.getCenter();
      callbacksRef.current.onUserMoveEnd?.({ lat: current.lat, lng: current.lng });
    });

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- khởi tạo 1 lần; tâm/zoom đổi qua moveKey
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handlers = [map.dragging, map.scrollWheelZoom, map.doubleClickZoom, map.touchZoom, map.keyboard, map.boxZoom];
    handlers.forEach((handler) => (interactive ? handler.enable() : handler.disable()));
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || sameCenter(map.getCenter(), center)) return;
    programmaticRef.current = true;
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), zoom), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ di chuyển khi code yêu cầu (moveKey)
  }, [moveKey]);

  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const restaurant of nearby) {
      if (!restaurant.location) continue;
      L.marker([restaurant.location.lat, restaurant.location.lng], {
        icon: nearbyIcon(restaurant.id === highlightedId),
        keyboard: false,
        title: restaurant.name,
      })
        .bindTooltip(restaurant.name, { direction: "top", offset: [0, -8] })
        .on("click", () => callbacksRef.current.onSelectNearby?.(restaurant.id))
        .addTo(layer);
    }
  }, [nearby, highlightedId]);

  return (
    <div className="relative size-full isolate">
      <div ref={containerRef} className="size-full" />
      {/* Ghim cố định giữa — nhấc lên khi đang kéo map. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[500]">
        <span
          className={cn(
            "absolute left-1/2 top-0 h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/25 transition-transform duration-150",
            isMoving ? "scale-75" : "scale-100",
          )}
        />
        <svg
          width="34"
          height="44"
          viewBox="0 0 32 42"
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -translate-y-full drop-shadow-md transition-[margin,opacity,filter] duration-150 ease-out",
            isMoving ? "-mt-2" : "mt-0",
            pinMuted && !isMoving && "opacity-60 grayscale",
          )}
        >
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="var(--color-accent-strong)" />
          <circle cx="16" cy="16" r="6.5" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
}

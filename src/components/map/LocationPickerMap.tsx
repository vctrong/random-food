"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onPick: (location: { lat: number; lng: number }) => void;
}

function createPinIcon() {
  return L.divIcon({
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="#F07FA5"/>
        <circle cx="16" cy="16" r="6.5" fill="#FFFFFF"/>
      </svg>
    `,
    className: "",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

/**
 * Bản đồ chọn vị trí bằng cách click/kéo marker — nguồn toạ độ DUY NHẤT khi
 * tạo Restaurant mới (CLAUDE.md mục 7.3, không tự suy toạ độ từ text địa chỉ).
 * Tự quản vòng đời qua L.map()/map.remove() như LeafletMap.tsx để tránh lỗi
 * "Map container is being reused" khi mount/unmount nhanh.
 */
export default function LocationPickerMap({ lat, lng, onPick }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number };
    if (leafletContainer._leaflet_id) {
      delete leafletContainer._leaflet_id;
    }

    const map = L.map(container, { center: [lat, lng], zoom: 15 });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: createPinIcon(), draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const position = marker.getLatLng();
      onPickRef.current({ lat: position.lat, lng: position.lng });
    });

    map.on("click", (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khởi tạo map 1 lần, di chuyển marker qua effect riêng bên dưới
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - lat) > 1e-9 || Math.abs(current.lng - lng) > 1e-9) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}

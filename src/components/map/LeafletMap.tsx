"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface LeafletMapProps {
  lat: number;
  lng: number;
  label: string;
  address: string;
}

/**
 * Pin màu Primary Blue thay cho marker mặc định sặc sỡ của Leaflet (mục 4.3 CLAUDE.md).
 * Dùng divIcon + SVG inline — không cần thêm file ảnh marker riêng.
 */
function createPinIcon() {
  return L.divIcon({
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="#5B9EEB"/>
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
 * Dùng Leaflet API thuần (thay vì react-leaflet's <MapContainer>) và tự quản lý
 * vòng đời qua useEffect — react-leaflet double-init container khi component bị
 * mount/unmount nhanh (modal đóng/mở, đổi món ở trang Random, React Strict Mode ở
 * dev) và ném lỗi "Map container is being reused by another instance". Tự tạo/huỷ
 * map bằng L.map()/map.remove() tránh hẳn lỗi này.
 */
export default function LeafletMap({ lat, lng, label, address }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Phòng trường hợp container còn giữ dấu vết từ lần mount trước chưa kịp dọn.
    const leafletContainer = container as HTMLDivElement & { _leaflet_id?: number };
    if (leafletContainer._leaflet_id) {
      delete leafletContainer._leaflet_id;
    }

    const map = L.map(container, {
      center: [lat, lng],
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([lat, lng], { icon: createPinIcon() })
      .addTo(map)
      .bindPopup(`<strong>${label}</strong><br/>${address}`);

    return () => {
      map.remove();
    };
  }, [lat, lng, label, address]);

  return <div ref={containerRef} className="w-full h-full rounded-xl isolate" />;
}

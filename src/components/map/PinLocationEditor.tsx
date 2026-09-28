"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin, MapPinOff, RotateCcw } from "lucide-react";
import { CAN_THO_CENTER, WARD_ZOOM } from "@/features/contribute-food/useRestaurantLocation";

const PinMapCanvas = dynamic(() => import("./PinMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="size-full bg-primary-soft animate-skeleton flex items-center justify-center text-primary">
      <MapPin className="size-6" aria-hidden />
    </div>
  ),
});

interface PinLocationEditorProps {
  initial: { lat: number; lng: number } | null;
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number } | null) => void;
}

/** Chỉnh toạ độ quán kiểu ghim cố định giữa (kéo bản đồ) — dùng ở màn duyệt/xử lý báo cáo. */
export function PinLocationEditor({ initial, value, onChange }: PinLocationEditorProps) {
  const [view, setView] = useState({ center: initial ?? CAN_THO_CENTER, moveKey: 0 });
  const changed = JSON.stringify(initial) !== JSON.stringify(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-52 overflow-hidden rounded-xl border border-border isolate">
        <PinMapCanvas
          center={view.center}
          moveKey={view.moveKey}
          zoom={WARD_ZOOM + 2}
          interactive
          pinMuted={!value}
          onUserMoveEnd={(center) => onChange(center)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-secondary tabular-nums">
          {value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Chưa có toạ độ — kéo bản đồ để đặt ghim"}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 min-h-9 rounded-lg px-2 font-semibold text-text-secondary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MapPinOff className="size-3.5" aria-hidden />
            Bỏ toạ độ
          </button>
        )}
        {changed && (
          <button
            type="button"
            onClick={() => {
              onChange(initial);
              setView((prev) => ({ center: initial ?? CAN_THO_CENTER, moveKey: prev.moveKey + 1 }));
            }}
            className="inline-flex items-center gap-1 min-h-9 rounded-lg px-2 font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Về vị trí cũ
          </button>
        )}
      </div>
    </div>
  );
}

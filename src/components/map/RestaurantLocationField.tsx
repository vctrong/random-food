"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Crosshair, Expand, Loader2, MapPin, MapPinOff, Store, X } from "lucide-react";
import { cn, formatDistance, shortenAddress } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useIsMobile } from "@/components/ui/ResponsivePicker";
import { RestaurantImage } from "@/components/restaurant/RestaurantImage";
import { useGeolocation } from "@/features/contribute-food/useGeolocation";
import { WARD_ZOOM, type RestaurantLocationState } from "@/features/contribute-food/useRestaurantLocation";
import type { LocationSource, RestaurantOption } from "@/types/restaurant";

const PinMapCanvas = dynamic(() => import("./PinMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="size-full bg-primary-soft animate-skeleton flex items-center justify-center text-primary">
      <MapPin className="size-6" aria-hidden />
    </div>
  ),
});

const SOURCE_BADGE: Record<LocationSource, { label: string; className: string }> = {
  none: { label: "Chưa ghim", className: "bg-surface text-text-secondary" },
  geocoded: { label: "Theo địa chỉ", className: "bg-warning/90 text-text-primary" },
  pin_confirmed: { label: "Đã ghim", className: "bg-primary-strong text-white" },
  gps: { label: "Theo GPS", className: "bg-primary-strong text-white" },
};

interface RestaurantLocationFieldProps {
  location: RestaurantLocationState;
  addressInputId: string;
  onPickExisting: (restaurant: RestaurantOption) => void;
}

/**
 * Địa chỉ (bắt buộc) + ghim trên bản đồ (không bắt buộc) cho quán mới.
 * Desktop kéo bản đồ trực tiếp; mobile bản đồ nhỏ chỉ để xem, chạm vào mở toàn
 * màn hình để chỉnh rồi "Xác nhận vị trí".
 */
export function RestaurantLocationField({ location, addressInputId, onPickExisting }: RestaurantLocationFieldProps) {
  const isMobile = useIsMobile();
  const geo = useGeolocation();
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const { pin, view } = location;
  const badge = SOURCE_BADGE[pin.source];

  async function pinMyLocation() {
    const point = await geo.request();
    if (point) location.pinByUser(point, true, true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Địa chỉ — đường A: geocode khi rời ô / Enter */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={addressInputId} required valid={location.address.trim().length > 0}>
          Địa chỉ quán
        </FieldLabel>
        <div className="relative">
          <input
            id={addressInputId}
            value={location.address}
            aria-required
            autoComplete="street-address"
            onChange={(event) => location.setAddress(event.target.value)}
            onBlur={() => void location.commitAddress()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void location.commitAddress();
              }
            }}
            placeholder="Vd: 45 Mậu Thân, Ninh Kiều, Cần Thơ"
            className="w-full h-11 pl-4 pr-10 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary/80 transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          {(location.geocodeStatus === "loading" || location.isReversing) && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary animate-spin" aria-hidden />
          )}
        </div>
        <div aria-live="polite" className="text-xs">
          {location.geocodeStatus === "loading" && <p className="text-text-secondary">Đang tìm vị trí trên bản đồ…</p>}
          {location.geocodeStatus === "found" && (
            <p className="flex items-start gap-1.5 text-text-primary">
              <MapPin className="size-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
              Ghim đã đúng chỗ quán chưa? Kéo bản đồ để chỉnh nếu lệch nha.
            </p>
          )}
          {(location.geocodeStatus === "not_found" || location.geocodeStatus === "error") && (
            <p className="text-text-secondary">
              Chưa định vị được địa chỉ này — bạn kéo bản đồ tới đúng chỗ để ghim, hoặc bỏ qua cũng được.
            </p>
          )}
        </div>

        {location.addressSuggestion && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-primary-line bg-primary-soft/60 p-3">
            <p className="flex-1 min-w-0 text-xs text-text-primary">
              Địa chỉ theo vị trí trên bản đồ: <span className="font-semibold break-words">{location.addressSuggestion}</span>
            </p>
            <div className="flex gap-2 shrink-0">
              <Button type="button" size="sm" onClick={location.acceptAddressSuggestion}>
                Dùng địa chỉ này
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={location.dismissAddressSuggestion}>
                Giữ của tôi
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bản đồ — đường B */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <FieldLabel hint="Kéo bản đồ để đặt quán vào giữa ghim.">Vị trí trên bản đồ</FieldLabel>
          <div className="flex items-center gap-1">
            {pin.location && (
              <button
                type="button"
                onClick={location.clearPin}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MapPinOff className="size-3.5" aria-hidden />
                Bỏ ghim
              </button>
            )}
            <button
              type="button"
              onClick={() => void pinMyLocation()}
              disabled={geo.status === "locating"}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-primary bg-primary-soft hover:bg-primary-soft/70 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {geo.status === "locating" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <span aria-hidden>📍</span>}
              Tôi đang ở quán này
            </button>
          </div>
        </div>
        {geo.errorMessage && <p className="text-xs text-accent-ink">{geo.errorMessage}</p>}

        <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-border isolate">
          <PinMapCanvas
            center={view.center}
            moveKey={view.moveKey}
            zoom={WARD_ZOOM}
            interactive={!isMobile}
            pinMuted={!pin.location}
            nearby={location.nearby}
            highlightedId={location.duplicate?.id ?? null}
            onUserMoveEnd={(center) => location.pinByUser(center)}
            onSelectNearby={location.focusNearby}
          />
          <span className={cn("absolute left-3 top-3 z-[600] rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm", badge.className)}>
            {badge.label}
          </span>
          {isMobile && (
            <button
              type="button"
              onClick={() => setFullscreenOpen(true)}
              className="absolute inset-0 z-[650] flex items-end justify-center bg-transparent pb-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/40"
              aria-label="Mở bản đồ toàn màn hình để chỉnh vị trí"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3.5 py-2 text-xs font-semibold text-text-primary shadow-md">
                <Expand className="size-3.5 text-primary" aria-hidden />
                Chạm để chỉnh vị trí
              </span>
            </button>
          )}
        </div>
        {!pin.location && !isMobile && (
          <p className="text-xs text-text-secondary">Chưa ghim — kéo bản đồ tới đúng chỗ quán, hoặc bỏ qua nếu không chắc.</p>
        )}
      </div>

      {location.duplicate && (
        <DuplicateSuggestion
          restaurant={location.duplicate}
          onPick={() => onPickExisting(location.duplicate as RestaurantOption)}
          onDismiss={() => location.dismissDuplicate((location.duplicate as RestaurantOption).id)}
        />
      )}

      {isMobile && (
        <FullscreenLocationEditor
          open={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          initialCenter={pin.location ?? view.center}
          nearby={location.nearby}
          onConfirm={(center, fromGps) => {
            location.pinByUser(center, fromGps, true);
            setFullscreenOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DuplicateSuggestion({
  restaurant,
  onPick,
  onDismiss,
}: {
  restaurant: RestaurantOption;
  onPick: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-accent bg-accent-soft p-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
          <RestaurantImage images={restaurant.image} alt={restaurant.name} sizes="48px" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-accent-ink">Quán này có sẵn rồi phải không?</p>
          <p className="truncate text-sm font-semibold text-text-primary">{restaurant.name}</p>
          <p className="truncate text-xs text-text-secondary">
            {restaurant.distanceMeters !== null && `${formatDistance(restaurant.distanceMeters)} · `}
            {shortenAddress(restaurant.address)}
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button type="button" size="sm" onClick={onPick} leftIcon={<Store className="size-4" aria-hidden />}>
          Chọn quán này
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          Không phải
        </Button>
      </div>
    </div>
  );
}

function FullscreenLocationEditor({
  open,
  onClose,
  initialCenter,
  nearby,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  initialCenter: { lat: number; lng: number };
  nearby: RestaurantOption[];
  onConfirm: (center: { lat: number; lng: number }, fromGps: boolean) => void;
}) {
  const geo = useGeolocation();
  const [view, setView] = useState({ center: initialCenter, moveKey: 0 });
  const draftRef = useRef({ center: initialCenter, fromGps: false });
  const [wasOpen, setWasOpen] = useState(open);

  // Mỗi lần mở lại: bắt đầu từ vị trí đang ghim (điều chỉnh state theo prop, không dùng effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView({ center: initialCenter, moveKey: 0 });
  }

  useEffect(() => {
    if (!open) return;
    draftRef.current = { center: initialCenter, fromGps: false };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở/đóng
  }, [open]);

  async function locate() {
    const point = await geo.request();
    if (!point) return;
    draftRef.current = { center: point, fromGps: true };
    setView((prev) => ({ center: point, moveKey: prev.moveKey + 1 }));
  }

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Chỉnh vị trí quán" className="fixed inset-0 z-[1100] flex flex-col bg-surface">
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng, không lưu"
          className="size-11 rounded-full flex items-center justify-center text-text-secondary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5" aria-hidden />
        </button>
        <h2 className="text-base font-heading text-text-primary">Chỉnh vị trí quán</h2>
      </div>
      <div className="relative flex-1 min-h-0">
        <PinMapCanvas
          center={view.center}
          moveKey={view.moveKey}
          zoom={WARD_ZOOM + 2}
          interactive
          nearby={nearby}
          onUserMoveEnd={(center) => {
            draftRef.current = { center, fromGps: false };
          }}
        />
        <button
          type="button"
          onClick={() => void locate()}
          disabled={geo.status === "locating"}
          className="absolute left-3 bottom-3 z-[600] inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-surface text-sm font-semibold text-primary shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {geo.status === "locating" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
          Tôi đang ở quán này
        </button>
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {geo.errorMessage ? (
          <p className="text-xs text-accent-ink">{geo.errorMessage}</p>
        ) : (
          <p className="text-xs text-text-secondary">Kéo bản đồ để đặt đúng cửa quán vào đầu ghim.</p>
        )}
        <Button type="button" fullWidth size="lg" onClick={() => onConfirm(draftRef.current.center, draftRef.current.fromGps)} leftIcon={<Check className="size-5" aria-hidden />}>
          Xác nhận vị trí
        </Button>
      </div>
    </div>,
    document.body,
  );
}

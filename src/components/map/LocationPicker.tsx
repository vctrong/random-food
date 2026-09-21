"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { LocateFixed, Loader2, MapPin, Search } from "lucide-react";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-soft-blue animate-pulse flex items-center justify-center text-primary-blue">
      <MapPin className="size-6" aria-hidden />
    </div>
  ),
});

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
}

/** Cần Thơ — tâm bản đồ mặc định khi chưa chọn vị trí nào. */
export const DEFAULT_CAN_THO_CENTER = { lat: 10.0333, lng: 105.7469 };

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  async function runSearch(searchQuery: string): Promise<GeocodeResult[]> {
    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setNotFound(false);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      const found: GeocodeResult[] = Array.isArray(data) ? data : [];
      if (requestId === requestIdRef.current) {
        setResults(found);
        setNotFound(found.length === 0);
      }
      return found;
    } catch {
      if (requestId === requestIdRef.current) setResults([]);
      return [];
    } finally {
      if (requestId === requestIdRef.current) setIsSearching(false);
    }
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setNotFound(false);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (nextQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void runSearch(nextQuery);
    }, 500);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        setIsLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền vị trí cho trang này trong trình duyệt."
            : "Không lấy được vị trí hiện tại, vui lòng thử lại.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 3) return;

    const found = results.length > 0 ? results : await runSearch(query);
    if (found.length > 0) selectResult(found[0]);
  }

  function selectResult(result: GeocodeResult) {
    onChange({ lat: result.lat, lng: result.lng });
    setQuery(result.label);
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Tìm địa chỉ để định vị nhanh (vd: 123 Nguyễn Văn Cừ, Ninh Kiều)"
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-secondary/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
        />
        {isSearching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary animate-spin" aria-hidden />
        )}
        {results.length > 0 && (
          <ul className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-border overflow-hidden max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <li key={`${result.lat}-${result.lng}-${index}`}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-text-primary hover:bg-soft-blue transition-colors flex items-start gap-2"
                >
                  <MapPin className="size-4 shrink-0 mt-0.5 text-primary-pink" aria-hidden />
                  <span className="line-clamp-2">{result.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notFound && !isSearching && (
        <p className="text-xs text-text-secondary">
          Không tìm thấy địa chỉ này. Thử bỏ số nhà/hẻm hoặc nhấp trực tiếp lên bản đồ để đặt ghim.
        </p>
      )}

      {locationError && <p className="text-xs text-primary-pink">{locationError}</p>}

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLocating}
        className="self-start inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-white text-sm font-medium text-primary-blue hover:bg-soft-blue transition-colors disabled:opacity-60"
      >
        {isLocating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
        Dùng vị trí hiện tại của tôi
      </button>

      <div className="h-80 sm:h-96 rounded-xl overflow-hidden border border-border isolate">
        <LocationPickerMap lat={value.lat} lng={value.lng} onPick={onChange} />
      </div>

      <p className="text-xs text-text-secondary">
        Nhấp hoặc kéo ghim trên bản đồ để chọn đúng vị trí quán · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
      </p>
    </div>
  );
}

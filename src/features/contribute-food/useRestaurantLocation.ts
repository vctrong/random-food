"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geocodeAddress, reverseGeocode } from "@/services/geocodeService";
import { fetchNearbyRestaurants } from "@/services/restaurantService";
import { applyGeocodeResult, applyUserPin, canGeocodeMovePin, pickDuplicateCandidate, type PinState } from "./locationLogic";
import type { RestaurantOption } from "@/types/restaurant";

/** Trung tâm Cần Thơ (Ninh Kiều) — tâm mặc định khi chưa có vị trí. */
export const CAN_THO_CENTER = { lat: 10.0333, lng: 105.7469 };
export const WARD_ZOOM = 15;

const REVERSE_DEBOUNCE_MS = 700;
const NEARBY_DEBOUNCE_MS = 500;
const MIN_GEOCODE_LENGTH = 5;

export type GeocodeStatus = "idle" | "loading" | "found" | "not_found" | "error";

/**
 * State địa chỉ + ghim của quán mới:
 * - Đường A: user gõ địa chỉ → khi rời ô/Enter mới geocode (không theo từng phím) → dời map.
 * - Đường B: user kéo map / bấm "Tôi đang ở quán này" → reverse geocode → điền ô địa chỉ,
 *   nhưng nếu user đã tự sửa ô địa chỉ thì chỉ gợi ý, không ghi đè.
 */
export function useRestaurantLocation(restaurantName: string) {
  const [address, setAddressState] = useState("");
  const [pin, setPin] = useState<PinState>({ location: null, source: "none" });
  const [view, setView] = useState({ center: CAN_THO_CENTER, moveKey: 0 });
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [addressSuggestion, setAddressSuggestion] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [nearby, setNearby] = useState<RestaurantOption[]>([]);
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());
  const [focusedNearbyId, setFocusedNearbyId] = useState<string | null>(null);

  const addressEditedByUser = useRef(false);
  const addressRef = useRef(address);
  const pinRef = useRef(pin);
  const lastGeocodedRef = useRef("");
  const geocodeController = useRef<AbortController | null>(null);
  const reverseController = useRef<AbortController | null>(null);
  const reverseTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      geocodeController.current?.abort();
      reverseController.current?.abort();
      if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
    },
    [],
  );

  useEffect(() => {
    addressRef.current = address;
    pinRef.current = pin;
  }, [address, pin]);

  const updatePin = useCallback((next: PinState) => {
    pinRef.current = next;
    setPin(next);
  }, []);

  const moveMap = useCallback((center: { lat: number; lng: number }) => {
    setView((prev) => ({ center, moveKey: prev.moveKey + 1 }));
  }, []);

  const setAddress = useCallback((value: string) => {
    addressEditedByUser.current = true;
    addressRef.current = value;
    setAddressState(value);
    setGeocodeStatus("idle");
  }, []);

  /** Đường A — gọi khi blur/Enter. */
  const commitAddress = useCallback(async () => {
    const query = addressRef.current.trim();
    if (query.length < MIN_GEOCODE_LENGTH || query === lastGeocodedRef.current) return;
    if (!canGeocodeMovePin(pinRef.current.source)) return;
    lastGeocodedRef.current = query;

    geocodeController.current?.abort();
    const controller = new AbortController();
    geocodeController.current = controller;
    setGeocodeStatus("loading");
    const outcome = await geocodeAddress(query, controller.signal);
    if (controller.signal.aborted) return;
    if (!outcome.ok) {
      lastGeocodedRef.current = "";
      setGeocodeStatus("error");
      updatePin(applyGeocodeResult(pinRef.current, null));
      return;
    }
    const hit = outcome.data;
    const next = applyGeocodeResult(pinRef.current, hit);
    if (next !== pinRef.current) {
      updatePin(next);
      if (hit) moveMap(hit);
    }
    setGeocodeStatus(hit ? "found" : "not_found");
  }, [moveMap, updatePin]);

  const scheduleReverse = useCallback((point: { lat: number; lng: number }) => {
    if (reverseTimer.current) window.clearTimeout(reverseTimer.current);
    reverseTimer.current = window.setTimeout(async () => {
      reverseController.current?.abort();
      const controller = new AbortController();
      reverseController.current = controller;
      setIsReversing(true);
      const outcome = await reverseGeocode(point, controller.signal);
      if (controller.signal.aborted) return;
      setIsReversing(false);
      if (!outcome.ok || !outcome.data) return;
      const found = outcome.data;
      const current = addressRef.current.trim();
      if (addressEditedByUser.current && current) {
        setAddressSuggestion(found === current ? null : found);
        return;
      }
      lastGeocodedRef.current = found;
      addressRef.current = found;
      setAddressSuggestion(null);
      setAddressState(found);
    }, REVERSE_DEBOUNCE_MS);
  }, []);

  /** Đường B — user kéo map xong / xác nhận vị trí / GPS. */
  const pinByUser = useCallback(
    (point: { lat: number; lng: number }, fromGps = false, moveView = false) => {
      updatePin(applyUserPin(point, fromGps));
      setGeocodeStatus("idle");
      if (moveView) moveMap(point);
      scheduleReverse(point);
    },
    [moveMap, scheduleReverse, updatePin],
  );

  const acceptAddressSuggestion = useCallback(() => {
    if (!addressSuggestion) return;
    addressEditedByUser.current = false;
    lastGeocodedRef.current = addressSuggestion;
    addressRef.current = addressSuggestion;
    setAddressState(addressSuggestion);
    setAddressSuggestion(null);
  }, [addressSuggestion]);

  const clearPin = useCallback(() => {
    updatePin({ location: null, source: "none" });
    setGeocodeStatus("idle");
    setAddressSuggestion(null);
    lastGeocodedRef.current = "";
  }, [updatePin]);

  /** Điền sẵn (vd sửa đóng góp sau này) — không tính là user tự sửa. */
  const reset = useCallback(() => {
    addressEditedByUser.current = false;
    lastGeocodedRef.current = "";
    addressRef.current = "";
    setAddressState("");
    updatePin({ location: null, source: "none" });
    setGeocodeStatus("idle");
    setAddressSuggestion(null);
    setNearby([]);
    setDismissedIds(new Set());
  }, [updatePin]);

  const pinKey = pin.location ? `${pin.location.lat.toFixed(5)},${pin.location.lng.toFixed(5)}` : "";
  useEffect(() => {
    if (!pin.location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bỏ ghim thì bỏ luôn quán gần
      setNearby([]);
      return;
    }
    const point = pin.location;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchNearbyRestaurants(point, controller.signal)
        .then(setNearby)
        .catch(() => undefined);
    }, NEARBY_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so sánh vị trí qua pinKey
  }, [pinKey]);

  const duplicate = useMemo(() => {
    const focused = focusedNearbyId ? nearby.find((item) => item.id === focusedNearbyId) : null;
    return focused ?? pickDuplicateCandidate(nearby, restaurantName, dismissedIds);
  }, [nearby, restaurantName, dismissedIds, focusedNearbyId]);

  const dismissDuplicate = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    setFocusedNearbyId(null);
  }, []);

  return {
    address,
    setAddress,
    commitAddress,
    pin,
    view,
    pinByUser,
    clearPin,
    reset,
    geocodeStatus,
    isReversing,
    addressSuggestion,
    acceptAddressSuggestion,
    dismissAddressSuggestion: () => setAddressSuggestion(null),
    nearby,
    duplicate,
    focusNearby: setFocusedNearbyId,
    dismissDuplicate,
    /** Prefill tên/địa chỉ ban đầu khi mở form. */
    prefillAddress: (value: string) => {
      addressEditedByUser.current = false;
      addressRef.current = value;
      setAddressState(value);
    },
  };
}

export type RestaurantLocationState = ReturnType<typeof useRestaurantLocation>;

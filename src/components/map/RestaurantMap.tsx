"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import type { FoodRestaurantLocation } from "@/types/food";
import { getGoogleMapsUrl } from "@/lib/utils";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-soft-blue animate-pulse flex items-center justify-center text-primary-blue">
      <MapPin className="size-6" aria-hidden />
    </div>
  ),
});

interface RestaurantMapProps {
  location: FoodRestaurantLocation | null;
  name: string;
  address: string;
  className?: string;
}

/** Leaflet cần `window` nên phải import động với ssr:false (mục 2 quy tắc ranh giới CLAUDE.md). */
export function RestaurantMap({ location, name, address, className }: RestaurantMapProps) {
  if (!location) {
    return (
      <div
        className={`w-full h-full rounded-xl bg-soft-blue/60 flex flex-col items-center justify-center gap-2 text-text-secondary text-sm p-4 text-center ${className ?? ""}`}
      >
        <MapPin className="size-5" aria-hidden />
        <span>Chưa có vị trí bản đồ cho quán này</span>
        <a
          href={getGoogleMapsUrl(null, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-primary-blue hover:bg-primary-blue hover:text-white transition-colors"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          <span>Tìm theo địa chỉ trên Google Maps</span>
        </a>
      </div>
    );
  }

  return (
    <div className={`relative isolate ${className ?? ""}`}>
      <LeafletMap lat={location.lat} lng={location.lng} label={name} address={address} />
      <a
        href={getGoogleMapsUrl(location, address)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-[500] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md text-xs font-semibold text-primary-blue hover:bg-primary-blue hover:text-white transition-colors"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        <span>Mở Google Maps</span>
      </a>
    </div>
  );
}

"use client";

import { useState, type Ref } from "react";
import { ChevronDown, LocateFixed, Loader2, MapPin, Plus, Store } from "lucide-react";
import { cn, formatDistance, shortenAddress } from "@/lib/utils";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";
import { SearchListbox } from "@/components/ui/SearchListbox";
import { HighlightText } from "@/components/ui/HighlightText";
import { RestaurantImage } from "@/components/restaurant/RestaurantImage";
import { useRestaurantSearch } from "@/features/contribute-food/useRestaurantSearch";
import { useGeolocation } from "@/features/contribute-food/useGeolocation";
import type { RestaurantOption } from "@/types/restaurant";

interface RestaurantPickerProps {
  selected: RestaurantOption | null;
  onSelect: (restaurant: RestaurantOption) => void;
  /** Không thấy quán → chuyển sang tạo quán mới, điền sẵn tên vừa gõ. */
  onCreateNew: (prefillName: string) => void;
  labelledBy: string;
}

function RestaurantRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2.5 py-2 animate-skeleton" aria-hidden>
      <div className="size-12 shrink-0 rounded-xl bg-background" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-2/3 rounded-md bg-background" />
        <div className="h-3 w-5/6 rounded-md bg-background" />
      </div>
    </div>
  );
}

/**
 * Chọn quán đã có: 5 quán đầu (gần nhất nếu đã có quyền vị trí, không thì mới
 * thêm gần đây), cuộn tải thêm 10 quán/lượt, tìm không dấu + chịu lỗi gõ, tô đậm
 * phần khớp. Không có kết quả → "Thêm quán mới: '<tên vừa gõ>'".
 */
export function RestaurantPicker({ selected, onSelect, onCreateNew, labelledBy }: RestaurantPickerProps) {
  const [open, setOpen] = useState(false);
  const geo = useGeolocation();
  const search = useRestaurantSearch(open, geo.position);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && geo.status === "idle") void geo.requestIfGranted();
    if (!next) search.setQuery("");
  }

  const typed = search.query.trim();

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={handleOpenChange}
      title="Chọn quán bán món này"
      tallSheet
      maxHeight={460}
      trigger={(props) => (
        <button
          type="button"
          ref={props.ref as Ref<HTMLButtonElement>}
          aria-expanded={props["aria-expanded"]}
          aria-haspopup={props["aria-haspopup"]}
          aria-labelledby={labelledBy}
          onClick={props.onClick}
          className={cn(
            "w-full min-h-16 flex items-center gap-3 rounded-2xl border bg-surface p-2.5 pr-3.5 text-left transition-[border-color,box-shadow]",
            "hover:border-primary-line focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
            props["aria-expanded"] ? "border-primary ring-4 ring-primary/15" : "border-border",
          )}
        >
          {selected ? (
            <>
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
                <RestaurantImage images={selected.image} alt={selected.name} sizes="48px" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">{selected.name}</span>
                <span className="block truncate text-xs text-text-secondary">{shortenAddress(selected.address)}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">Đổi</span>
            </>
          ) : (
            <>
              <span className="size-12 shrink-0 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                <Store className="size-5" aria-hidden />
              </span>
              <span className="flex-1 min-w-0 text-sm text-text-secondary">Tìm quán theo tên hoặc địa chỉ…</span>
              <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
            </>
          )}
        </button>
      )}
    >
      <SearchListbox
        query={search.query}
        onQueryChange={search.setQuery}
        placeholder='Vd: "hu tieu" hoặc "ninh kieu"'
        inputLabel="Tìm quán"
        sections={[{ id: "restaurants", options: search.items }]}
        getOptionId={(restaurant) => restaurant.id}
        isSelected={(restaurant) => restaurant.id === selected?.id}
        onSelect={(restaurant) => {
          onSelect(restaurant);
          handleOpenChange(false);
        }}
        status={search.status}
        errorMessage="Không tải được danh sách quán."
        onRetry={search.retry}
        hasMore={search.hasMore}
        isLoadingMore={search.isLoadingMore}
        onLoadMore={search.loadMore}
        renderSkeleton={() => <RestaurantRowSkeleton />}
        skeletonCount={5}
        toolbar={
          geo.status === "ready" ? (
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              <MapPin className="size-3.5 text-primary" aria-hidden />
              Đang ưu tiên quán gần bạn
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => void geo.request()}
                disabled={geo.status === "locating"}
                className="self-start inline-flex items-center gap-1.5 h-8 px-2.5 -ml-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {geo.status === "locating" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <LocateFixed className="size-3.5" aria-hidden />
                )}
                Ưu tiên quán gần tôi
              </button>
              {geo.errorMessage && <p className="text-xs text-accent-ink">{geo.errorMessage}</p>}
            </div>
          )
        }
        renderOption={(restaurant) => (
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
              <RestaurantImage images={restaurant.image} alt={restaurant.name} sizes="48px" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">
                <HighlightText text={restaurant.name} query={search.appliedQuery} />
              </span>
              <span className="block truncate text-xs text-text-secondary">
                <HighlightText text={shortenAddress(restaurant.address)} query={search.appliedQuery} />
              </span>
            </span>
            {restaurant.distanceMeters !== null && (
              <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                {formatDistance(restaurant.distanceMeters)}
              </span>
            )}
          </div>
        )}
        empty={
          typed ? (
            <span>
              Chưa có quán nào khớp “{typed}”.
              <br />
              Có thể quán chưa có trên NayAnGi — thêm mới luôn nha.
            </span>
          ) : (
            "Chưa có quán nào được duyệt."
          )
        }
        footer={
          <button
            type="button"
            onClick={() => {
              onCreateNew(typed);
              handleOpenChange(false);
            }}
            className="w-full min-h-11 flex items-center gap-2 rounded-xl border border-dashed border-primary-line px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{typed ? `Thêm quán mới: “${typed}”` : "Không thấy quán? Thêm quán mới"}</span>
          </button>
        }
      />
    </ResponsivePicker>
  );
}

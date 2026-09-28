"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertCircle, Check, Loader2, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListboxSection<T> {
  id: string;
  label?: string;
  options: T[];
}

interface SearchListboxProps<T> {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  /** Nhãn a11y của ô tìm kiếm. */
  inputLabel: string;
  sections: ListboxSection<T>[];
  getOptionId: (option: T) => string;
  renderOption: (option: T, state: { active: boolean; selected: boolean }) => ReactNode;
  isSelected?: (option: T) => boolean;
  isDisabled?: (option: T) => boolean;
  onSelect: (option: T) => void;
  multiple?: boolean;
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  /** Còn trang kế — sentinel cuối danh sách sẽ gọi onLoadMore khi cuộn tới. */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  empty?: ReactNode;
  /** Hàng cố định cuối danh sách (vd "Thêm quán mới"). */
  footer?: ReactNode;
  renderSkeleton?: () => ReactNode;
  skeletonCount?: number;
  autoFocus?: boolean;
  /** Hàng công cụ ngay dưới ô tìm kiếm (vd nút "Gần tôi"). */
  toolbar?: ReactNode;
}

/**
 * Ô tìm kiếm + listbox theo mẫu combobox ARIA: focus ở ô nhập, ↑/↓ di chuyển
 * mục đang chọn (aria-activedescendant), Enter chọn, Home/End về đầu/cuối.
 * Dùng bên trong ResponsivePicker (popover desktop / bottom sheet mobile).
 */
export function SearchListbox<T>({
  query,
  onQueryChange,
  placeholder,
  inputLabel,
  sections,
  getOptionId,
  renderOption,
  isSelected = () => false,
  isDisabled = () => false,
  onSelect,
  multiple = false,
  status = "ready",
  errorMessage = "Không tải được danh sách.",
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  empty,
  footer,
  renderSkeleton,
  skeletonCount = 5,
  autoFocus = true,
  toolbar,
}: SearchListboxProps<T>) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flat = useMemo(() => sections.flatMap((section) => section.options), [sections]);
  const optionDomId = (option: T) => `${baseId}-opt-${getOptionId(option)}`;
  const safeActive = activeIndex >= 0 && activeIndex < flat.length ? activeIndex : -1;
  const activeOption = safeActive >= 0 ? flat[safeActive] : null;

  useEffect(() => {
    if (!activeOption) return;
    document.getElementById(optionDomId(activeOption))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cuộn khi mục đang chọn đổi
  }, [activeOption]);

  // Focus sau 1 frame + preventScroll: popover/bottom sheet vừa mount chưa định vị xong, focus ngay sẽ kéo trang cuộn.
  useEffect(() => {
    if (!autoFocus) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [autoFocus]);

  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current?.();
      },
      { root: listRef.current, rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, flat.length]);

  function move(step: number) {
    if (flat.length === 0) return;
    let next = safeActive;
    for (let i = 0; i < flat.length; i++) {
      next = (next + step + flat.length) % flat.length;
      if (!isDisabled(flat[next])) break;
    }
    setActiveIndex(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home" && flat.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && flat.length > 0) {
      event.preventDefault();
      setActiveIndex(flat.length - 1);
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      if (!isDisabled(activeOption)) onSelect(activeOption);
    }
  }

  const showSkeleton = status === "loading" && flat.length === 0;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary pointer-events-none" aria-hidden />
          <input
            type="text"
            role="combobox"
            aria-label={inputLabel}
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? optionDomId(activeOption) : undefined}
            ref={inputRef}
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background text-sm text-text-primary placeholder:text-text-secondary/80 transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          {status === "loading" && flat.length > 0 ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary animate-spin" aria-hidden />
          ) : (
            query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="Xoá từ khoá"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" aria-hidden />
              </button>
            )
          )}
        </div>
        {toolbar && <div className="mt-2">{toolbar}</div>}
      </div>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={inputLabel}
        aria-multiselectable={multiple || undefined}
        aria-busy={status === "loading"}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2 scroll-smooth"
      >
        {showSkeleton &&
          Array.from({ length: skeletonCount }, (_, index) => (
            <li key={`skeleton-${index}`} role="presentation" className="px-1 py-1">
              {renderSkeleton ? renderSkeleton() : <div className="h-11 rounded-xl bg-background animate-skeleton" />}
            </li>
          ))}

        {status === "error" && flat.length === 0 && (
          <li role="presentation" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <AlertCircle className="size-6 text-accent-ink" aria-hidden />
            <p className="text-sm text-text-primary">{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="size-4" aria-hidden />
                Thử lại
              </button>
            )}
          </li>
        )}

        {status !== "loading" && status !== "error" && flat.length === 0 && (
          <li role="presentation" className="px-4 py-6 text-center text-sm text-text-secondary">
            {empty ?? "Không tìm thấy kết quả phù hợp."}
          </li>
        )}

        {sections.map((section) =>
          section.options.length === 0 ? null : (
            <li key={section.id} role="presentation">
              {section.label && (
                <div className="sticky top-0 z-[1] bg-surface/95 backdrop-blur-sm px-2.5 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  {section.label}
                </div>
              )}
              <ul role="group" aria-label={section.label}>
                {section.options.map((option) => {
                  const index = flat.indexOf(option);
                  const selected = isSelected(option);
                  const disabled = isDisabled(option);
                  const active = index === safeActive;
                  return (
                    <li
                      key={getOptionId(option)}
                      id={optionDomId(option)}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={disabled || undefined}
                      onMouseMove={() => !disabled && activeIndex !== index && setActiveIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => !disabled && onSelect(option)}
                      className={cn(
                        "relative flex items-center gap-3 min-h-11 my-0.5 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-colors",
                        selected && "bg-primary-soft",
                        active && !selected && "bg-background",
                        active && "ring-2 ring-inset ring-primary/35",
                        disabled && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex-1 min-w-0">{renderOption(option, { active, selected })}</div>
                      <Check
                        className={cn("size-4 shrink-0 text-primary transition-opacity", selected ? "opacity-100" : "opacity-0")}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          ),
        )}

        {hasMore && (
          <li ref={sentinelRef} role="presentation" className="px-1 py-1">
            {isLoadingMore &&
              (renderSkeleton ? (
                <div className="flex flex-col gap-1">
                  {renderSkeleton()}
                  {renderSkeleton()}
                </div>
              ) : (
                <div className="h-11 rounded-xl bg-background animate-skeleton" />
              ))}
          </li>
        )}

        {footer && <li role="presentation" className="pt-1">{footer}</li>}
      </ul>
    </div>
  );
}

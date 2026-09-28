"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsivePicker } from "@/components/ui/ResponsivePicker";

export interface SelectMenuOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

interface SelectMenuProps<V extends string> {
  value: V | null;
  onChange: (value: V) => void;
  options: SelectMenuOption<V>[];
  placeholder: string;
  /** Nhãn a11y + tiêu đề bottom sheet. */
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Dropdown chọn 1 giá trị (thay <select> native) cho danh sách ngắn: popover trên
 * desktop, bottom sheet trên mobile. Bàn phím: ↑/↓/Home/End di chuyển, Enter/Space chọn, Esc đóng.
 */
export function SelectMenu<V extends string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  disabled = false,
  size = "md",
  className,
}: SelectMenuProps<V>) {
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${baseId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, baseId]);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(last, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <ResponsivePicker
      open={open}
      onOpenChange={(next) => {
        if (next) setActiveIndex(Math.max(0, selectedIndex));
        setOpen(next);
      }}
      title={label}
      minWidth={200}
      maxHeight={320}
      trigger={(props) => (
        <button
          type="button"
          ref={props.ref as Ref<HTMLButtonElement>}
          aria-expanded={props["aria-expanded"]}
          aria-haspopup="listbox"
          aria-label={`${label}: ${selected?.label ?? placeholder}`}
          onClick={props.onClick}
          disabled={disabled}
          className={cn(
            "w-full inline-flex items-center gap-2 rounded-xl border bg-surface text-left transition-[border-color,box-shadow] disabled:opacity-60 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
            size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-3.5 text-sm",
            props["aria-expanded"] ? "border-primary ring-4 ring-primary/15" : "border-border hover:border-primary-line",
            className,
          )}
        >
          <span className={cn("flex-1 truncate", selected ? "font-medium text-text-primary" : "text-text-secondary")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-text-secondary transition-transform", props["aria-expanded"] && "rotate-180")} aria-hidden />
        </button>
      )}
    >
      <ul
        ref={listRef}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${baseId}-${activeIndex}`}
        onKeyDown={handleKeyDown}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 focus:outline-none"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <li
              key={option.value}
              id={`${baseId}-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseMove={() => activeIndex !== index && setActiveIndex(index)}
              onClick={() => choose(index)}
              className={cn(
                "flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors",
                isSelected ? "bg-primary-soft font-semibold text-text-primary" : "text-text-primary",
                isActive && !isSelected && "bg-background",
                isActive && "ring-2 ring-inset ring-primary/35",
                option.disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <span className="flex-1 truncate">{option.label}</span>
              <Check className={cn("size-4 shrink-0 text-primary", isSelected ? "opacity-100" : "opacity-0")} strokeWidth={2.5} aria-hidden />
            </li>
          );
        })}
      </ul>
    </ResponsivePicker>
  );
}

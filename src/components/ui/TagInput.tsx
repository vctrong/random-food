"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  tone: "blue" | "red";
}

export function TagInput({ tags, onAdd, onRemove, placeholder, tone }: TagInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    onAdd(value);
    setValue("");
  };

  const tagClasses =
    tone === "blue"
      ? "bg-primary-soft text-primary"
      : "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${tagClasses}`}
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={`Xoá ${tag}`}
            className="hover:opacity-70"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <div className="relative inline-flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="h-8 px-3 rounded-full bg-primary-soft/40 text-text-primary text-sm focus:bg-surface focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-secondary w-44 transition-all"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Thêm"
          className="ml-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-strong text-white shadow-sm hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

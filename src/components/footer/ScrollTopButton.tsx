"use client";

import { ArrowUp } from "lucide-react";

export function ScrollTopButton() {
  function scrollTop() {
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollTop}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 bg-surface px-4 font-heading text-xs text-primary-strong shadow-md transition-transform hover:-translate-y-1 dark:text-primary"
    >
      Lên đầu trang
      <ArrowUp className="size-4" aria-hidden />
    </button>
  );
}

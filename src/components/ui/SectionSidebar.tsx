"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SectionSidebarProps {
  items: SectionNavItem[];
}

/**
 * Điều hướng dùng chung cho trang Cài đặt + Hồ sơ (mục 4 yêu cầu: bố cục thống
 * nhất, trước đây mỗi trang tự làm 1 kiểu khác nhau). Desktop: sidebar sticky
 * bên trái, tự highlight mục đang xem khi scroll (IntersectionObserver). Mobile:
 * thanh tab ngang cuộn được, bám theo section tương ứng.
 */
export function SectionSidebar({ items }: SectionSidebarProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((item) => item.id).join(",")]);

  return (
    <>
      {/* Mobile: tab ngang cuộn được */}
      <nav
        aria-label="Điều hướng mục"
        className="lg:hidden -mx-4 px-4 mb-6 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1"
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
              activeId === item.id
                ? "bg-soft-blue border-primary-blue text-primary-blue font-bold"
                : "bg-surface border-border text-text-secondary hover:text-text-primary",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </a>
        ))}
      </nav>

      {/* Desktop: sidebar sticky */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-24 bg-surface border border-border rounded-2xl p-2 space-y-0.5">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "true" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                activeId === item.id
                  ? "bg-soft-blue text-primary-blue font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-soft-blue/40",
              )}
            >
              <item.icon className="size-4.5" aria-hidden />
              {item.label}
            </a>
          ))}
        </div>
      </aside>
    </>
  );
}

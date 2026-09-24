"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const THEME_ORDER = ["light", "dark", "system"] as const;
type ThemeValue = (typeof THEME_ORDER)[number];

const THEME_ICON: Record<ThemeValue, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL: Record<ThemeValue, string> = {
  light: "Chủ đề sáng",
  dark: "Chủ đề tối",
  system: "Theo hệ thống",
};

/** Nút tròn nhỏ, bấm để chuyển tuần tự Sáng → Tối → Theo hệ thống — dùng ở Header/UserMenu. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes chỉ biết theme thật sau khi mount (đọc localStorage phía client) —
  // tránh hiển thị icon sai (mismatch server/client) bằng cách render placeholder trước đó.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current = (mounted ? (theme as ThemeValue) : undefined) ?? "system";
  const Icon = THEME_ICON[current];

  function cycleTheme() {
    const nextIndex = (THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length;
    setTheme(THEME_ORDER[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${THEME_LABEL[current]} — bấm để đổi chủ đề`}
      title={THEME_LABEL[current]}
      className={cn(
        "size-10 rounded-full flex items-center justify-center text-text-secondary hover:text-primary bg-surface hover:bg-primary-soft border border-accent/40 transition-colors",
        className,
      )}
    >
      {mounted ? <Icon className="size-4.5" aria-hidden /> : <span className="size-4.5" aria-hidden />}
    </button>
  );
}

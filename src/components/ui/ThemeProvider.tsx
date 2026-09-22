"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * attribute="class" — Tailwind v4 dùng @custom-variant dark (&:where(.dark, .dark *))
 * trong globals.css để khớp đúng class ".dark" mà next-themes gắn lên <html>.
 * next-themes tự chèn 1 script inline (được CSP script-src 'unsafe-inline' cho phép
 * sẵn — xem next.config.ts) để set class TRƯỚC khi paint, tránh nháy sáng khi tải trang.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem storageKey="nayangi-theme">
      {children}
    </NextThemesProvider>
  );
}

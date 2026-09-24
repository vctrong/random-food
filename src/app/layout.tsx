import type { Metadata } from "next";
import localFont from "next/font/local";
import { Quicksand } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ThemeDbSync } from "@/components/ui/ThemeDbSync";
import { Header } from "@/components/ui/Header";
import { MobileNav } from "@/components/ui/MobileNav";
import { Footer } from "@/components/ui/Footer";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { SessionErrorGuard } from "@/components/auth/SessionErrorGuard";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FoodQuickActionsBubble } from "@/components/food/FoodQuickActionsBubble";
import { BRAND } from "@/constants/brand";
import { SITE_URL } from "@/config/env";
import "./globals.css";

/**
 * Hệ font — xem docs/design-system.md cho bảng ánh xạ "thành phần → font".
 * - Fredoka One (bản Việt hoá DVN, file local, 1 weight 700): MỌI tiêu đề.
 * - Quicksand (Google, subset vietnamese): body/UI mặc định toàn app.
 * Sedgwick Ave (--font-handwriting) KHÔNG load ở đây — chỉ load trong
 * src/app/ve-chung-toi/layout.tsx.
 */
const fredoka = localFont({
  src: "./fonts/DVN-Fredoka-Bold.ttf",
  variable: "--font-heading",
  weight: "700",
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

/**
 * Icon/ảnh chia sẻ dùng file convention của Next: src/app/favicon.ico (16/32/48),
 * icon.png (192x192 — bội số 48px theo chuẩn favicon của Google), apple-icon.png 180 (linh vật nền xanh) và opengraph-image.png (logo vuông có chữ) —
 * Next tự sinh thẻ <link>/<meta>. Manifest PWA ở src/app/manifest.ts.
 */
export const metadata: Metadata = {
  // Domain công khai (không phải NEXTAUTH_URL) — canonical/og:url tương đối được tính theo đây.
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND.seoName, template: `%s | ${BRAND.seoName}` },
  description: BRAND.description,
  applicationName: BRAND.seoName,
  openGraph: {
    siteName: BRAND.seoName,
    title: BRAND.seoName,
    description: BRAND.description,
    locale: "vi_VN",
    type: "website",
  },
  verification: {
    google: "rrF8L3nUmBA8oDvnlbVxHfWi0Aq9Y_2x8l6X7sRelZg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${fredoka.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-body text-text-primary">
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <SessionProvider>
              <ToastProvider>
                <SessionErrorGuard />
                <ThemeDbSync />
                <Header />
                <main className="flex-1 pt-(--header-h)">{children}</main>
                <Footer />
                <MobileNav />
                <FoodQuickActionsBubble />
              </ToastProvider>
            </SessionProvider>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}

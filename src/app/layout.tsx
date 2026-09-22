import type { Metadata } from "next";
import { Sedgwick_Ave, Lexend, Mulish } from "next/font/google";
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
import "./globals.css";

/**
 * Hệ 3 font (thay hoàn toàn Montserrat/Open Sans cũ) — xem docs/design-system.md
 * cho bảng ánh xạ "thành phần → font" đầy đủ.
 * - Sedgwick Ave: display/hero, chỉ 1 weight (400, static) — KHÔNG dùng font-bold.
 * - Lexend: heading phụ (H2-H4, card/modal/stat).
 * - Mulish: body/UI mặc định toàn app.
 * Cả 3 đều confirm hỗ trợ subset "vietnamese" qua metadata chính thức Google Fonts.
 */
const sedgwickAve = Sedgwick_Ave({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const lexend = Lexend({
  variable: "--font-subheading",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hôm Nay Ăn Gì?",
  description: "Trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.",
  verification: {
    google: "rrF8L3nUmBA8oDvnlbVxHfWi0Aq9Y_2x8l6X7sRelZg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${sedgwickAve.variable} ${lexend.variable} ${mulish.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream font-body text-text-primary">
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <SessionProvider>
              <ToastProvider>
                <SessionErrorGuard />
                <ThemeDbSync />
                <Header />
                <main className="flex-1 pt-16">{children}</main>
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

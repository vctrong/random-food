import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { Header } from "@/components/ui/Header";
import { MobileNav } from "@/components/ui/MobileNav";
import { Footer } from "@/components/ui/Footer";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { SessionErrorGuard } from "@/components/auth/SessionErrorGuard";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-heading",
  weight: ["600", "700"],
  subsets: ["latin", "vietnamese"],
});

const openSans = Open_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Hôm Nay Ăn Gì?",
  description: "Trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream font-sans text-text-primary">
        <SessionProvider>
          <ToastProvider>
            <SessionErrorGuard />
            <Header />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
            <MobileNav />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/ui/Header";
import { MobileNav } from "@/components/ui/MobileNav";
import { Footer } from "@/components/ui/Footer";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Hôm Nay Ăn Gì?",
  description: "Trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream font-sans text-text-primary">
        <Header />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}

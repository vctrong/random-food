import { Sedgwick_Ave } from "next/font/google";

/**
 * Sedgwick Ave (font viết tay) CHỈ dùng trong thư ngỏ trang "Về chúng tôi" (tiêu đề
 * thư, lời chào, "Thân gửi,", chữ ký) — load riêng ở layout route này để không kéo
 * font vào các trang khác. Dùng qua `text-display-handwriting` / `font-handwriting`.
 * Body thư (Patrick Hand) khai báo riêng trong components/about/OpenLetter.tsx.
 */
const sedgwickAve = Sedgwick_Ave({
  variable: "--font-handwriting",
  weight: "400",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export default function AboutLayout({ children }: LayoutProps<"/ve-chung-toi">) {
  return <div className={sedgwickAve.variable}>{children}</div>;
}

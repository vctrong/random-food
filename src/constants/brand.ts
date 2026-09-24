/** Nhận diện thương hiệu — tên hiển thị "Nay Ăn Gì?", tên SEO "NayAnGi" và bộ logo trong public/brand/. */
export const BRAND = {
  /** Tên hiển thị trên giao diện (navbar, footer...). */
  name: "Nay Ăn Gì?",
  /** Tên thương hiệu cho SEO: title, site name, JSON-LD, manifest — khớp domain nayangi.io.vn và logo "NAYANGI". */
  seoName: "NayAnGi",
  tagline: "Chọn món khó? Có app lo!",
  description: "Không còn băn khoăn mỗi bữa ăn — trợ lý random món ăn cho sinh viên và người trẻ ở Cần Thơ.",
  /** Linh vật nền trong suốt — navbar, menu mobile, loading (hợp cả light/dark). */
  mascot: "/brand/nayangi-mascot.png",
  /** Logo đầy đủ hình + chữ trên nền xanh — footer, trang đăng nhập/đăng ký. Tỉ lệ 1200x437. */
  logoFull: { src: "/brand/nayangi-logo-full.png", width: 1200, height: 437 },
} as const;

export const CONTACTS = {
  email: "trongvc.work913@gmail.com",
  phoneDisplay: "0336 922 235",
  phone: "0336922235",
  zalo: "https://zalo.me/0336922235",
  website: "https://nayangi.io.vn",
  websiteDisplay: "nayangi.io.vn",
  facebook: "https://facebook.com/nayangi.social",
} as const;

# NayAnGi — Design System: Hệ thống Typography

> Tài liệu chi tiết cho hệ font đã chốt (thay thế hệ Sedgwick Ave + Lexend + Mulish cũ). `CLAUDE.md` mục 4.4 chỉ tóm tắt và link sang đây — đây mới là nguồn đầy đủ. Nếu 2 tài liệu lệch nhau, coi code thực tế (`src/app/layout.tsx`, `src/app/ve-chung-toi/layout.tsx`, `src/app/globals.css`) là đúng và cập nhật lại file này.

---

## 1. Các font đã chốt

| Vai trò | Font | Nguồn | CSS variable | Tailwind utility | Weight | Phạm vi |
|---|---|---|---|---|---|---|
| Heading (MỌI tiêu đề) | **Fredoka One** — bản Việt hoá DVN | `next/font/local` → `src/app/fonts/DVN-Fredoka-Bold.ttf` | `--font-heading` | `font-heading` | Chỉ 700 (1 file tĩnh) | Toàn app |
| Body / UI | **Quicksand** | `next/font/google`, subset `latin` + `vietnamese` | `--font-body` | `font-body` (và `font-sans`) | Variable 300–700 | Toàn app |
| Viết tay | **Sedgwick Ave** | `next/font/google`, subset `latin` + `vietnamese` | `--font-handwriting` | `font-handwriting`, `.text-display-handwriting` | Chỉ 400 | **CHỈ thư ngỏ trang "Về chúng tôi"** (`/ve-chung-toi`): tiêu đề thư, lời chào, "Thân gửi,", chữ ký |
| Body thư ngỏ | **Patrick Hand** | `next/font/google`, subset `latin` + `vietnamese` | `--font-letter` | `.letter-body` | Chỉ 400 | **CHỈ body thư ngỏ** — khai báo trong `src/components/about/OpenLetter.tsx`, `.variable` chỉ gắn trên `<article>` của thư |

- **Không dùng bản Fredoka One trên Google Fonts** — bản gốc không hỗ trợ đầy đủ dấu tiếng Việt. File DVN đã được kiểm tra cmap: đủ toàn bộ ký tự tiếng Việt (ă â đ ê ô ơ ư + 5 dấu thanh, cả chữ hoa).
- Lexend và Mulish đã gỡ hoàn toàn khỏi dự án.

**Cấu hình font toàn app** (`src/app/layout.tsx`):

```ts
import localFont from "next/font/local";
import { Quicksand } from "next/font/google";

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
```

Gắn 2 class variable lên `<html>`, `font-body` là mặc định của `<body>`.

**Font viết tay — chỉ load trong route "Về chúng tôi"** (`src/app/ve-chung-toi/layout.tsx`):

```tsx
const sedgwickAve = Sedgwick_Ave({
  variable: "--font-handwriting",
  weight: "400",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export default function AboutLayout({ children }: LayoutProps<"/ve-chung-toi">) {
  return <div className={sedgwickAve.variable}>{children}</div>;
}
```

Biến `--font-handwriting` chỉ tồn tại bên trong `<div>` này — dùng `font-handwriting` ở trang khác sẽ không có tác dụng (rơi về font kế thừa). **Không** load Sedgwick Ave ở root layout.

**Font body thư ngỏ — Patrick Hand** (`src/components/about/OpenLetter.tsx`): `Patrick_Hand({ variable: "--font-letter", weight: "400", subsets: ["latin", "vietnamese"] })`, `.variable` gắn trên `<article>` của thư. Dùng qua utility `.letter-body` (globals.css): cỡ `clamp(1.125rem, …, 1.375rem)` (~18px → ~22px), `line-height: 1.85`, `max-width: 62ch`, căn trái, khoảng cách đoạn `1.15em`.

**Tailwind (v4, khai báo trong CSS)** — `src/app/globals.css`:

```css
/* Font PHẢI dùng @theme inline vì tham chiếu var() do next/font tự sinh. */
@theme inline {
  --font-sans: var(--font-body);
  --font-heading: var(--font-heading);
  --font-body: var(--font-body);
  --font-handwriting: var(--font-handwriting);
  --font-letter: var(--font-letter);
}
```

**Mặc định heading** — MỌI thẻ `h1`-`h6` mặc định dùng Fredoka One:

```css
/* Bọc @layer base — nếu để trần, rule này sẽ đè cả class .text-display/.text-h2
   dù class có specificity cao hơn, vì Tailwind v4 xếp @utility vào layer
   "utilities" còn CSS không bọc layer luôn thắng CSS có layer (cascade layers). */
@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }
}
```

---

## 2. Bảng "thành phần → font" (quy tắc áp dụng)

| Thành phần | Font | Ghi chú |
|---|---|---|
| H1 Trang chủ (landing hero) | Fredoka One | `.text-display` |
| Tiêu đề section lớn trên landing | Fredoka One | `.text-display-sm` (qua `SectionHeading`) |
| H1 trang Tin tức | Fredoka One | `.text-display-sm` |
| H1 trang "Về chúng tôi" | Fredoka One | `.text-display` (như mọi trang khác) |
| **Tiêu đề thư, lời chào, "Thân gửi,", chữ ký trong thư ngỏ** | **Sedgwick Ave** | `.text-display-handwriting` / `font-handwriting` — nơi DUY NHẤT dùng font viết tay |
| **Body thư ngỏ** | **Patrick Hand** | `.letter-body` |
| Tên món trong kết quả random, tên gu ở card mức độ ăn | Fredoka One | class `font-heading` trực tiếp, tự set size theo ngữ cảnh |
| H1 trang chức năng (Hồ sơ, Cài đặt, Admin, Reviewer, Lịch sử, Đã lưu, chi tiết món...) | Fredoka One | Mặc định `h1`, không cần class riêng |
| H2, H3, H4, tiêu đề card/modal, tiêu đề nhóm, dashboard | Fredoka One | Mặc định, hoặc `.text-h2`/`.text-h3`/`.text-h4` nếu cần size chuẩn |
| Số liệu nổi bật (stats) | Fredoka One | `.text-stat` |
| Toàn bộ body text, mô tả | Quicksand | Mặc định (kế thừa từ `<body>`) |
| Nút bấm, label, input, placeholder, badge, navbar, bảng dữ liệu | Quicksand | |
| Tooltip, toast, chú thích | Quicksand | `.text-caption` cho chú thích nhỏ |

**Lưu ý weight:**
- Fredoka One chỉ có 1 file weight 700. Mọi `font-normal`/`font-semibold`/`font-bold` trên heading đều hiển thị cùng 1 độ đậm (trình duyệt dùng face 700, không giả đậm) — không cần và không nên thêm class weight để "làm đậm hơn".
- Quicksand tối đa 700 — `font-extrabold`/`font-black` hiển thị như 700.
- Sedgwick Ave chỉ 400 — không kèm `font-bold`/`font-semibold` (tránh faux-bold làm vỡ nét viết tay).

---

## 3. Type scale — utility class dùng chung

Định nghĩa trong `src/app/globals.css` bằng Tailwind v4 `@utility`, dùng `clamp()` để tự responsive.

| Class | Font | Size (fluid, mobile → desktop) | Dùng cho |
|---|---|---|---|
| `.text-display` | Fredoka One | `clamp(2.25rem, …, 3.75rem)` (~36px→60px) | H1 landing hero |
| `.text-display-sm` | Fredoka One | `clamp(1.75rem, …, 3rem)` (~28px→48px) | Section title landing, H1 Tin tức |
| `.text-display-handwriting` | Sedgwick Ave | `clamp(1.75rem, …, 3rem)` (~28px→48px) | **Chỉ** tiêu đề thư ngỏ trang "Về chúng tôi" |
| `.letter-body` | Patrick Hand | `clamp(1.125rem, …, 1.375rem)` (~18px→22px), line-height 1.85 | **Chỉ** body thư ngỏ |
| `.text-h2` | Fredoka One | `clamp(1.5rem, …, 1.875rem)` (~24px→30px) | H2 |
| `.text-h3` | Fredoka One | `clamp(1.125rem, …, 1.25rem)` (~18px→20px) | H3, tiêu đề card/modal |
| `.text-h4` | Fredoka One | `1rem` (16px) | H4, tiêu đề nhóm nhỏ |
| `.text-stat` | Fredoka One | `clamp(1.5rem, …, 2.25rem)` (~24px→36px) | Số liệu nổi bật |
| `.text-caption` | Quicksand | `0.75rem` (12px) | Chú thích, label phụ |

Component không bắt buộc dùng đúng các class trên — nhiều chỗ vẫn tự set size bằng Tailwind thường (`text-lg`, `text-2xl`...) kèm `font-heading` hoặc thừa hưởng mặc định `h1`-`h6`.

---

## 4. Ví dụ thực tế trong code

```tsx
// H1 landing hero (src/components/food/HeroSection.tsx)
<h1 className="text-display text-text-primary">Hôm nay ăn gì?</h1>

// Section title landing (qua src/components/ui/SectionHeading.tsx)
<h2 className="text-display-sm text-text-primary">Hôm nay bạn muốn ăn theo gu nào?</h2>

// H1 trang Về chúng tôi (src/components/about/AboutHero.tsx) — Fredoka như các trang khác
<h1 className="text-display text-text-primary">Về chúng tôi</h1>

// Tiêu đề thư ngỏ (src/components/about/OpenLetter.tsx) — font viết tay
<h2 className="text-display-handwriting text-text-primary">Lá thư nhỏ từ NayAnGi</h2>

// Tên món trong kết quả random (src/components/food/RandomFoodResult.tsx)
<h1 className="font-heading text-3xl md:text-4xl">{currentFood.name}</h1>

// Số liệu nổi bật (src/components/food/StatsSection.tsx)
<p className={`text-stat ${toneClassName}`}>{value}</p>
```

---

## 5. Test chuỗi tiếng Việt đủ dấu

Câu test chuẩn khi thêm chỗ dùng font mới: *"Hôm nay ăn gì? Bún riêu, bánh xèo, hủ tiếu, chè bưởi, cơm tấm sườn nướng Cần Thơ"* — kiểm tra trên cả heading (Fredoka One) và body (Quicksand), cả 2 theme; các dấu chồng (ẩ, ỗ, ữ, ặ, ộ) phải hiển thị đúng, không rơi về font fallback.

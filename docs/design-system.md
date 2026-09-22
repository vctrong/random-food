# NayAnGi — Design System: Hệ thống Typography

> Tài liệu chi tiết cho hệ 3 font đã chốt (thay thế Montserrat + Open Sans cũ). `CLAUDE.md` mục 4.4 chỉ tóm tắt và link sang đây — đây mới là nguồn đầy đủ. Nếu 2 tài liệu lệch nhau, coi code thực tế (`src/app/layout.tsx`, `src/app/globals.css`) là đúng và cập nhật lại file này.

---

## 1. 3 font đã chốt

| Vai trò | Font | CSS variable | Tailwind utility | Weight | Google Fonts subsets |
|---|---|---|---|---|---|
| Display / hero | **Sedgwick Ave** | `--font-heading` | `font-heading` | Chỉ 400 (static, không phải variable) | latin, latin-ext, vietnamese ✅ |
| Subheading | **Lexend** | `--font-subheading` | `font-subheading` | Variable, dùng 500–700 | latin, latin-ext, vietnamese ✅ |
| Body / UI | **Mulish** | `--font-body` | `font-body` | Variable, dùng 400–800 | latin, latin-ext, vietnamese, cyrillic ✅ |

Cả 3 đã xác nhận hỗ trợ subset `vietnamese` qua metadata chính thức của Google Fonts (`github.com/google/fonts` → `ofl/sedgwickave`, `ofl/lexend`, `ofl/mulish` → `METADATA.pb`).

**Cấu hình** (`src/app/layout.tsx`):

```ts
import { Sedgwick_Ave, Lexend, Mulish } from "next/font/google";

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
```

Gắn cả 3 class variable lên `<html>`, `font-body` là mặc định của `<body>`.

**Tailwind (v4, khai báo trong CSS qua `@theme`)** — `src/app/globals.css`:

```css
/* Riêng font PHẢI dùng @theme inline vì tham chiếu var() do next/font tự sinh. */
@theme inline {
  --font-sans: var(--font-body);
  --font-heading: var(--font-heading);
  --font-subheading: var(--font-subheading);
  --font-body: var(--font-body);
}
```

Tailwind v4 tự sinh 3 utility `font-heading` / `font-subheading` / `font-body` từ 3 token trên — không cần khai báo thủ công.

**Mặc định heading** — MỌI thẻ `h1`-`h6` mặc định dùng Lexend (`font-subheading`), Sedgwick Ave chỉ áp qua class cụ thể ở mục 3:

```css
/* Bọc @layer base — nếu để trần, rule này sẽ đè cả class .text-display/.text-h2
   dù class có specificity cao hơn, vì Tailwind v4 xếp @utility vào layer
   "utilities" còn CSS không bọc layer luôn thắng CSS có layer (cascade layers). */
@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-subheading);
  }
}
```

---

## 2. Bảng "thành phần → font" (quy tắc áp dụng)

| Thành phần | Font | Ghi chú |
|---|---|---|
| H1 Trang chủ (landing hero) | Sedgwick Ave | `.text-display` |
| Tiêu đề section lớn trên landing (vd "Chỉ 3 bước để có ngay bữa ăn ưng ý", "Rating cao nhất mỗi kiểu thèm ăn", "Bớt suy nghĩ. Ăn ngon hơn.", "Sẵn sàng tìm món ngon cho hôm nay?") | Sedgwick Ave | `.text-display-sm` |
| H1 các trang public khác (Về chúng tôi, Tin tức) | Sedgwick Ave | `.text-display-sm` |
| Tên món trong kết quả random (`/random`, demo card ở Hero) | Sedgwick Ave | class `font-heading` trực tiếp (giữ size riêng theo ngữ cảnh card/photo-overlay, không dùng `.text-display*` vì size không hợp) |
| Wordmark/logo dạng chữ | Sedgwick Ave | hiện logo là ảnh (`/image/logo.png`), không áp dụng — nếu sau này đổi sang text logo thì dùng font này |
| **H1 trang chức năng** (Hồ sơ, Cài đặt, Admin, Reviewer, Lịch sử, Đã lưu, chi tiết món, danh sách món...) | **Lexend** | Mặc định, không cần class riêng |
| H2, H3, H4 (trừ các trường hợp Sedgwick Ave ở trên) | Lexend | Mặc định, hoặc `.text-h2`/`.text-h3`/`.text-h4` nếu cần size chuẩn |
| Tiêu đề card, tiêu đề modal | Lexend | |
| Tiêu đề nhóm trong Hồ sơ/Cài đặt (vd "Sở thích ăn uống", "Bảo mật") | Lexend | |
| Tiêu đề dashboard Admin/Reviewer | Lexend | |
| Số liệu nổi bật (stats, vd số món/số quán/lượt random) | Lexend, weight 700 | `.text-stat` |
| Tiêu đề các bước "cách hoạt động" | Lexend | |
| Toàn bộ body text, mô tả | Mulish | Mặc định (kế thừa từ `<body>`) |
| Nút bấm, label, input, placeholder | Mulish | |
| Badge, navbar, bảng dữ liệu | Mulish | |
| Tooltip, toast, chú thích | Mulish | `.text-caption` cho chú thích nhỏ |

**Quy tắc Sedgwick Ave riêng:**
- Không dùng kèm `font-bold`/`font-semibold` — chỉ 1 weight (400), thêm class weight khác sẽ bị trình duyệt giả đậm (faux-bold) gây vỡ nét chữ viết tay.
- Có `letter-spacing` nới nhẹ (`0.01em`) để dấu tiếng Việt (ẩ, ỗ, ữ, ặ, ộ...) không bị dính vào ký tự bên cạnh.
- Line-height thoáng hơn heading thường (1.15–1.2) vì glyph viết tay cao hơn.

---

## 3. Type scale — utility class dùng chung

Định nghĩa trong `src/app/globals.css` bằng Tailwind v4 `@utility`, dùng `clamp()` để tự responsive (không cần thêm `md:`/`lg:` ở nơi gọi).

| Class | Font | Weight | Size (fluid, mobile → desktop) | Dùng cho |
|---|---|---|---|---|
| `.text-display` | Sedgwick Ave | 400 | `clamp(2.25rem, …, 3.75rem)` (~36px→60px) | H1 landing hero |
| `.text-display-sm` | Sedgwick Ave | 400 | `clamp(1.75rem, …, 3rem)` (~28px→48px) | Section title landing, H1 trang public khác |
| `.text-h2` | Lexend | 600 | `clamp(1.5rem, …, 1.875rem)` (~24px→30px) | H2 (khi cần size chuẩn thay vì tự set) |
| `.text-h3` | Lexend | 600 | `clamp(1.125rem, …, 1.25rem)` (~18px→20px) | H3, tiêu đề card/modal |
| `.text-h4` | Lexend | 600 | `1rem` (16px, cố định) | H4, tiêu đề nhóm nhỏ |
| `.text-stat` | Lexend | 700 | `clamp(1.5rem, …, 2.25rem)` (~24px→36px) | Số liệu nổi bật |
| `.text-caption` | Mulish | 400 | `0.75rem` (12px, cố định) | Chú thích, label phụ |

Component không bắt buộc dùng đúng 7 class trên — nhiều chỗ (card title, dashboard title...) vẫn tự set size bằng Tailwind thường (`text-lg`, `text-2xl`...) và chỉ cần đúng `font-subheading`/thừa hưởng mặc định `h1`-`h6`. 7 class trên dùng khi cần **nhất quán type scale chuẩn** ở các vị trí mới, tránh mỗi chỗ tự chế 1 size khác nhau.

---

## 4. Ví dụ thực tế trong code

```tsx
// H1 landing hero (src/components/food/HeroSection.tsx)
<h1 className="text-display text-text-primary mb-4">
  Hôm nay ăn gì?
</h1>

// Section title landing (src/app/page.tsx)
<h2 className="text-display-sm text-text-primary mt-1">
  Hôm nay bạn muốn ăn theo gu nào?
</h2>

// Tên món trong kết quả random (src/components/food/RandomFoodResult.tsx)
<h1 className="font-heading text-3xl md:text-4xl drop-shadow-md tracking-wide">
  {currentFood.name}
</h1>

// Số liệu nổi bật (src/components/food/StatsSection.tsx)
<p className={`text-stat ${toneClassName}`}>{value}</p>

// H1 trang chức năng — KHÔNG cần class riêng, mặc định đã là Lexend
<h1 className="text-3xl font-bold text-text-primary mt-1">Hồ sơ &amp; Sở thích</h1>
```

---

## 5. Test chuỗi tiếng Việt đủ dấu

Câu test chuẩn khi thêm chỗ dùng font mới: *"Hôm nay ăn gì? Bún riêu, hủ tiếu, bánh xèo, chè bưởi, cơm tấm sườn nướng Cần Thơ"* — đã kiểm tra trực quan trên cả 3 font, cả 2 theme (sáng/tối), các dấu chồng (ẩ, ỗ, ữ, ặ, ộ) hiển thị đúng, không rơi về font fallback.

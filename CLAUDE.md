# CLAUDE.md — Random Food App (Cần Thơ)

Đây là file quy tắc bắt buộc cho Claude Code khi làm việc trong repo này. Đọc kỹ trước khi code bất kỳ dòng nào. Nếu có mâu thuẫn giữa file này và trí nhớ/thói quen mặc định của Claude, **file này luôn thắng**.

---

## 0. NGUYÊN TẮC TỐI THƯỢNG: KHÔNG ĐƯỢC TỰ BỊA

Đây là quy tắc quan trọng nhất trong toàn bộ file này.

- Nếu thiếu thông tin để làm đúng (data chưa có, chưa rõ hành vi mong muốn, chưa rõ tên field, chưa rõ route, chưa rõ style cho 1 trường hợp cụ thể...) → **DỪNG LẠI VÀ HỎI NGAY**, không tự đoán, không tự "làm tạm cho chạy".
- **KHÔNG** tự bịa ra:
    - Dữ liệu món ăn, địa chỉ, giá cả, hình ảnh không có trong `src/data/`
    - Tên package/thư viện không có trong `package.json`
    - API endpoint, route, hoặc backend chưa tồn tại
    - Số liệu thống kê, testimonial, nội dung marketing giả
    - Icon/asset không có sẵn trong `public/`
- Nếu cần thêm 1 package mới → hỏi trước, giải thích lý do, chờ xác nhận rồi mới cài.
- Nếu 1 yêu cầu có thể hiểu theo nhiều cách → liệt kê ngắn gọn các cách hiểu và hỏi, thay vì chọn đại 1 cách rồi code.
- Thà hỏi "ngu" còn hơn code sai hướng rồi phải sửa lại từ đầu.

---

## 1. Bối cảnh dự án

- Web app random món ăn từ danh sách quán ăn tại Cần Thơ do chủ dự án (Ttong) tự cung cấp.
- Giai đoạn hiện tại: **frontend-only**, dùng data cứng (hardcoded), **chưa có backend**.
- Kiến trúc được thiết kế để sau này gắn backend thật vào **không phải sửa lại component**, chỉ thay nội dung trong lớp `services/`.
- Đối tượng người dùng: sinh viên và người trẻ tại Cần Thơ — cần cảm giác gọn, nhanh, đáng tin, không "sến" hay "trẻ con".

---

## 2. Cấu trúc thư mục (BẮT BUỘC tuân theo)

```
src/
├── app/                    # Next.js App Router — chỉ routing + layout, KHÔNG chứa business logic
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── favicon.ico
│
├── components/
│   ├── ui/                 # Component nguyên tử, tái sử dụng, KHÔNG chứa business logic
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── food/                # Component gắn với domain "món ăn"
│   │   ├── FoodCard.tsx
│   │   ├── RandomFoodResult.tsx
│   │   └── RandomButton.tsx
│   └── filters/
│       └── FilterBar.tsx
│
├── features/
│   └── random-food/
│       ├── useRandomFood.ts   # Hook quản lý state
│       └── randomLogic.ts     # Thuật toán random thuần (không UI, không fetch)
│
├── services/                # LỚP DUY NHẤT được phép "biết" data đến từ đâu (data cứng hay API)
│   └── foodService.ts
│
├── data/                    # Data cứng — sẽ bị thay thế bởi backend, KHÔNG import trực tiếp từ component
│   └── foods.ts
│
├── types/
│   └── food.ts
│
├── lib/                      # Hàm tiện ích thuần túy, không liên quan business logic
│   └── utils.ts
│
├── constants/
│   └── categories.ts
│
└── config/
    └── env.ts
```

### Quy tắc ranh giới (KHÔNG được vi phạm):

1. **`components/` KHÔNG BAO GIỜ import trực tiếp từ `data/`.** Luôn đi qua `services/`.
2. **`app/page.tsx` phải mỏng** — chỉ compose component + gọi hook, không chứa logic random hay logic lọc dữ liệu.
3. **`features/*/randomLogic.ts` phải là hàm thuần (pure function)** — không side effect, không fetch, dễ test.
4. File nào cần `useState`, `useEffect`, `onClick`... phải có `"use client"` ở dòng đầu tiên.
5. Không tạo thư mục mới ngoài cấu trúc trên nếu chưa hỏi và được xác nhận.

---

## 3. Quy tắc code

- **Ngôn ngữ:** TypeScript strict — không dùng `any` trừ khi thực sự bất khả kháng (và phải giải thích tại sao trong comment).
- **Component:** function component + arrow function hoặc `function` khai báo rõ ràng, không mixed style trong cùng file.
- **Đặt tên:**
    - Component: PascalCase (`FoodCard.tsx`)
    - Hook: camelCase, tiền tố `use` (`useRandomFood.ts`)
    - Hàm thuần / util: camelCase (`pickRandomFood`)
    - Type/interface: PascalCase, không tiền tố `I` (`Food`, không phải `IFood`)
- **Import path:** luôn dùng alias `@/` (map tới `src/`), không dùng relative path dài (`../../../`).
- **Styling:** Tailwind CSS. Không viết inline style trừ khi giá trị động (vd: random vị trí, animation tính toán runtime).
- **Không cài thêm thư viện quản lý state (Zustand, Redux...) nếu chưa được yêu cầu** — mặc định dùng `useState`/`useReducer` trong hook riêng.
- Không xoá hoặc sửa file config (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`) trừ khi được yêu cầu rõ ràng.

---

## 4. Design System — BẮT BUỘC tuân thủ chính xác

### 4.1 Định hướng thẩm mỹ
Modern, professional, friendly, playful nhưng trưởng thành (playful but mature), food-focused, clean, premium nhưng gần gũi (approachable), phù hợp sinh viên/người trẻ, phân cấp thị giác rõ ràng (strong visual hierarchy), responsive tốt, chất lượng production-ready.

### 4.2 TUYỆT ĐỐI TRÁNH
- Aesthetic hoạt hình trẻ con (childish cartoon)
- Bo góc kiểu "bong bóng" quá mức
- Màu sắc sặc sỡ kiểu cầu vồng, quá bão hoà
- Illustration trẻ con
- Gradient quá đà
- Aesthetic "generic SaaS dashboard" (nhàm, rập khuôn)
- Gradient tím đậm kiểu "AI app" (mô típ dark purple AI-style)
- Glassmorphism quá mức
- Element trang trí quá khổ, thừa thãi
- Số liệu thống kê giả (fake stats)
- Testimonial giả
- Section marketing không cần thiết (vd: "Why choose us", banner quảng cáo giả)

### 4.3 Bảng màu (dùng CHÍNH XÁC các mã hex sau, không tự chế thêm màu)

| Vai trò | Tên | Hex |
|---|---|---|
| Primary | Primary Blue | `#5B9EEB` |
| Primary | Primary Pink | `#F07FA5` |
| Accent tối | Deep Blue | `#23466F` |
| Nền phụ | Soft Blue | `#EAF4FF` |
| Nền phụ | Soft Pink | `#FFF0F5` |
| Nền chính | Cream Background | `#FFF9F5` |
| Text | Primary Text | `#1F2937` |
| Text | Secondary Text | `#6B7280` |
| Border | Border | `#E5E7EB` |
| State | Success | `#54B889` |
| State | Warning | `#F4C95D` |

**Nguyên tắc dùng màu:**
- Xanh dương và hồng là 2 màu **accent thương hiệu** — dùng có chủ đích (nút chính, highlight, icon quan trọng), không nhồi vào mọi thứ.
- Đa số nền: trắng / cream / soft-blue / soft-pink rất nhạt.
- **Không được** biến mọi component thành nhiều màu — giữ visual hierarchy tiết chế, chuyên nghiệp.
- Khai báo các màu này như CSS variables / Tailwind theme tokens ngay từ đầu (không hardcode hex rải rác trong component).

### 4.4 Typography
- Font sans-serif hiện đại, hỗ trợ tiếng Việt tốt (dấu, ký tự đặc biệt hiển thị đúng).
- Phân cấp:
    - Hero heading: lớn, phong cách editorial
    - Section heading: cỡ trung
    - Body text: dễ đọc, thoải mái
    - Button label: rõ ràng, ngắn gọn
- Chữ đậm có chủ đích, **tránh font-weight quá nặng** (không lạm dụng `font-black`/900).

### 4.5 Ngôn ngữ thiết kế tổng thể
- Border radius: 12–20px tuỳ kích cỡ component (nút nhỏ dùng radius nhỏ hơn card lớn).
- Shadow tinh tế (subtle), không đổ bóng nặng.
- Border rõ ràng, sạch (dùng màu `Border #E5E7EB`).
- Spacing rộng rãi, thoáng.
- Card responsive, có breakpoint hợp lý cho mobile/tablet/desktop.
- Ảnh món ăn: chất lượng cao, đúng tỉ lệ, không kéo méo.
- Icon: đơn giản, liên quan chủ đề đồ ăn, nhất quán style (line icon hoặc filled icon — chọn 1 style xuyên suốt, không trộn).
- Transition/micro-interaction: mượt, tinh tế (hover, tap feedback), không lạm dụng animation nặng gây giật lag.

---

## 5. Quy trình làm việc với Claude Code

1. **Trước khi code 1 tính năng mới:** tóm tắt ngắn gọn kế hoạch (file nào sẽ tạo/sửa, luồng data đi qua đâu) rồi mới bắt đầu — để dễ review.
2. **Khi sửa file có sẵn:** đọc lại toàn bộ file trước khi sửa, không đoán nội dung từ trí nhớ.
3. **Khi không chắc chắn** về: tên field data, hành vi UX cụ thể (vd: random có loại trừ kết quả vừa ra không?), route, hoặc bất kỳ quyết định nào ảnh hưởng kiến trúc → **hỏi Ttong trước**, đưa ra tối đa 2–3 lựa chọn ngắn gọn kèm đề xuất cá nhân.
4. **Không tự ý refactor lớn** (đổi cấu trúc thư mục, đổi tên file hàng loạt) nếu không được yêu cầu.
5. Sau khi hoàn thành 1 tính năng, liệt kê ngắn gọn: file đã tạo/sửa + còn thiếu gì để hoạt động đầy đủ (vd: "cần thêm ảnh vào public/images/foods/").
6. Không viết comment thừa thãi kiểu giải thích code hiển nhiên; chỉ comment khi logic không tự nói lên được (vd: lý do chọn thuật toán random cụ thể).

---

## 6. Việc KHÔNG được làm nếu chưa hỏi

- Cài thêm dependency mới
- Đổi cấu trúc thư mục đã quy định ở mục 2
- Thêm màu ngoài bảng màu ở mục 4.3
- Viết section/nội dung marketing không được yêu cầu
- Tạo dữ liệu món ăn mẫu để "demo cho đẹp" — nếu cần data mẫu để test UI, phải hỏi trước và ghi rõ đây là data tạm, dễ nhận diện để xoá sau (vd: field `isPlaceholder: true`).
- Deploy, đổi config production, hoặc chạy lệnh có thể ảnh hưởng ra ngoài phạm vi local dev.

---

*File này sẽ được cập nhật khi dự án có thêm quyết định kiến trúc mới. Nếu Claude Code thấy quy tắc nào ở đây mâu thuẫn với yêu cầu mới của Ttong, phải hỏi lại để xác nhận nên ưu tiên cái nào trước khi code.*
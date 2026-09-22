# CLAUDE.md — NayAnGi (Random Food App, Cần Thơ)

Đây là file quy tắc bắt buộc cho Claude Code khi làm việc trong repo này. Đọc kỹ trước khi code bất kỳ dòng nào. Nếu có mâu thuẫn giữa file này và trí nhớ/thói quen mặc định của Claude, **file này luôn thắng**.

> **Lưu ý về bản chất file này:** `CLAUDE.md` chỉ chứa **rule chung** — quy tắc kiến trúc, coding convention, design system, quy trình làm việc. File này **không phải nơi để giao yêu cầu/tính năng cụ thể**. Yêu cầu công việc cụ thể (build tính năng X, sửa bug Y, redesign trang Z...) sẽ được nhập trực tiếp qua prompt trên Claude Code CLI ở từng phiên làm việc. Khi đọc file này, hãy hiểu nó như "hiến pháp" của project, không phải "việc cần làm hôm nay".

---

## 0. NGUYÊN TẮC TỐI THƯỢNG: KHÔNG ĐƯỢC TỰ BỊA

Đây là quy tắc quan trọng nhất trong toàn bộ file này.

- Nếu thiếu thông tin để làm đúng (data chưa có, chưa rõ hành vi mong muốn, chưa rõ tên field, chưa rõ route, chưa rõ style cho 1 trường hợp cụ thể...) → **DỪNG LẠI VÀ HỎI NGAY**, không tự đoán, không tự "làm tạm cho chạy".
- **KHÔNG** tự bịa ra:
  - Dữ liệu món ăn, địa chỉ, giá cả, hình ảnh không có trong `src/data/` hoặc chưa có trong DB
  - Tên package/thư viện không có trong `package.json`
  - API endpoint, route, hoặc backend chưa tồn tại
  - **Field mới trong schema Mongoose, tên collection mới, hoặc thay đổi kiểu dữ liệu của field đã chốt** — schema ở mục 7 là bản đã thống nhất, thêm/sửa/xoá field hoặc bảng phải hỏi trước
  - Số liệu thống kê, testimonial, nội dung marketing giả
  - Icon/asset không có sẵn trong `public/`
- Nếu cần thêm 1 package mới → hỏi trước, giải thích lý do, chờ xác nhận rồi mới cài.
- Nếu 1 yêu cầu có thể hiểu theo nhiều cách → liệt kê ngắn gọn các cách hiểu và hỏi, thay vì chọn đại 1 cách rồi code.
- Thà hỏi "ngu" còn hơn code sai hướng rồi phải sửa lại từ đầu.

---

## 1. Bối cảnh dự án

- Web app random món ăn từ danh sách quán ăn tại Cần Thơ do chủ dự án (Ttong) tự cung cấp.
- **Giai đoạn hiện tại: đã có hình dạng cơ bản của app, backend + database đã được gắn vào (không còn frontend-only nữa), đăng nhập Google qua NextAuth.js đã hoạt động.** Dữ liệu cứng cũ trong `src/data/` chỉ còn giữ vai trò tham khảo/legacy, ưu tiên dữ liệu thật từ MongoDB Atlas.
- Kiến trúc được thiết kế để gắn backend thật không phải sửa lại component, chỉ thay nội dung trong lớp `services/` (giờ `services/` sẽ gọi API route thay vì đọc `data/` trực tiếp).
- Backend viết chung trong cùng project Next.js (API Routes / Route Handlers), **không tách server riêng**.
- Đối tượng người dùng: sinh viên và người trẻ tại Cần Thơ — cần cảm giác gọn, nhanh, đáng tin, không "sến" hay "trẻ con".
- Schema DB ở mục 7 là **bản chốt tạm thời** — có thể mở rộng thêm field/bảng khi cần, nhưng mọi thay đổi phá vỡ cấu trúc đã chốt (xoá field, đổi kiểu dữ liệu, tách bảng) đều phải hỏi trước vì có thể cần migration.

### 1.1 BẮT BUỘC: đọc tài liệu trong `/docs` trước khi code

- Ở root repo có thư mục `/docs` chứa các file `.md` tài liệu tham khảo (ví dụ: mô tả database chi tiết, business logic, luồng nghiệp vụ, quyết định sản phẩm...) do Ttong cung cấp.
- **Trước khi bắt đầu bất kỳ task nào**, Claude Code phải quét và đọc các file `.md` liên quan trong `/docs` để hiểu đúng ngữ cảnh nghiệp vụ/dữ liệu, thay vì chỉ dựa vào rule/style trong `CLAUDE.md` này.
- `CLAUDE.md` chỉ quy định **rule và style chung** (kiến trúc, coding convention, design system, quy trình). Còn **nội dung nghiệp vụ, chi tiết database, ngữ cảnh sản phẩm** thì lấy từ `/docs`.
- Nếu `/docs` có thông tin mâu thuẫn với schema/rule đã chốt trong file này (ví dụ mục 7), phải dừng lại và hỏi Ttong xem nên ưu tiên tài liệu nào trước khi code — không tự ý chọn.
- Nếu 1 file trong `/docs` không rõ ràng, thiếu, hoặc có vẻ đã lỗi thời so với code hiện tại → hỏi lại thay vì đoán.

---

## 2. Cấu trúc thư mục (BẮT BUỘC tuân theo)

```
src/
├── app/                    # Next.js App Router — routing + layout + API routes
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── favicon.ico
│   └── api/                # Route Handlers — LỚP BACKEND DUY NHẤT, giữ mỏng
│       ├── auth/           # đăng ký / đăng nhập / session
│       ├── foods/
│       ├── categories/
│       ├── favorites/
│       ├── history/
│       └── logs/
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
│   ├── map/                 # Component bản đồ (Leaflet) — LocationPicker, FoodMap
│   └── filters/
│       └── FilterBar.tsx
│
├── features/
│   └── random-food/
│       ├── useRandomFood.ts   # Hook quản lý state
│       └── randomLogic.ts     # Thuật toán random thuần (không UI, không fetch)
│
├── services/                # LỚP DUY NHẤT được phép "biết" data đến từ đâu (API thật hay data cứng cũ)
│   └── foodService.ts
│
├── lib/
│   ├── mongodb.ts            # Kết nối MongoDB Atlas (singleton, tránh mở nhiều connection khi hot reload)
│   ├── cloudinary.ts          # Config Cloudinary SDK
│   ├── models/                # Mongoose schema — theo đúng mục 7, không tự thêm field
│   │   ├── User.ts
│   │   ├── UserProfile.ts
│   │   ├── Category.ts
│   │   ├── Food.ts
│   │   ├── Favorite.ts
│   │   ├── History.ts
│   │   └── Log.ts
│   └── utils.ts               # Hàm tiện ích thuần túy, không liên quan business logic
│
├── data/                    # LEGACY — data cứng cũ, đang được thay dần bởi DB thật, KHÔNG import trực tiếp từ component
│   └── foods.ts
│
├── types/
│   └── food.ts
│
├── constants/
│   └── categories.ts
│
└── config/
    └── env.ts

docs/                        # Tài liệu tham khảo (database, business, nghiệp vụ...) — xem mục 1.1
```

### Quy tắc ranh giới (KHÔNG được vi phạm):

1. **`components/` KHÔNG BAO GIỜ import trực tiếp từ `data/` hoặc `lib/models/`.** Luôn đi qua `services/`.
2. **`app/page.tsx` phải mỏng** — chỉ compose component + gọi hook, không chứa logic random hay logic lọc dữ liệu.
3. **`features/*/randomLogic.ts` phải là hàm thuần (pure function)** — không side effect, không fetch, dễ test.
4. **`app/api/**/route.ts` phải mỏng** — parse request, gọi model/service, trả response. Không nhét business logic phức tạp trực tiếp trong route handler.
5. File nào cần `useState`, `useEffect`, `onClick`... phải có `"use client"` ở dòng đầu tiên.
6. Component dùng `react-leaflet` bắt buộc import động (`next/dynamic`, `ssr: false`) vì thư viện cần `window`/DOM.
7. Không tạo thư mục mới ngoài cấu trúc trên nếu chưa hỏi và được xác nhận.

---

## 3. Quy tắc code

- **Ngôn ngữ:** TypeScript strict — không dùng `any` trừ khi thực sự bất khả kháng (và phải giải thích tại sao trong comment).
- **Component:** function component + arrow function hoặc `function` khai báo rõ ràng, không mixed style trong cùng file.
- **Đặt tên:**
  - Component: PascalCase (`FoodCard.tsx`)
  - Hook: camelCase, tiền tố `use` (`useRandomFood.ts`)
  - Hàm thuần / util: camelCase (`pickRandomFood`)
  - Type/interface: PascalCase, không tiền tố `I` (`Food`, không phải `IFood`)
  - Mongoose model: PascalCase số ít (`User`, `Food`, không phải `Users`/`Foods`)
- **Import path:** luôn dùng alias `@/` (map tới `src/`), không dùng relative path dài (`../../../`).
- **Styling:** Tailwind CSS. Không viết inline style trừ khi giá trị động (vd: random vị trí, animation tính toán runtime, hoặc kích thước bản đồ Leaflet).
- **Không cài thêm thư viện quản lý state (Zustand, Redux...) nếu chưa được yêu cầu** — mặc định dùng `useState`/`useReducer` trong hook riêng.
- Không xoá hoặc sửa file config (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`) trừ khi được yêu cầu rõ ràng.
- Biến môi trường (`.env.local`) không bao giờ commit lên git — đảm bảo có trong `.gitignore`.
- **Icon:** dùng thống nhất `lucide-react` (đã có trong `package.json`) cho toàn bộ giao diện — không dùng Material Symbols hoặc icon font khác, không trộn nhiều bộ icon.

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
- Marker/pin trên bản đồ Leaflet: ưu tiên dùng Primary Blue hoặc Primary Pink, không dùng marker mặc định sặc sỡ của Leaflet nếu không cần thiết.

### 4.4 Typography

**Hệ 3 font đã chốt: Sedgwick Ave (display) + Lexend (subheading) + Mulish (body).** Cả 3 đều load qua `next/font/google`, subset `['latin', 'vietnamese']`, `display: 'swap'`. Chi tiết đầy đủ — bảng ánh xạ "thành phần → font", type scale, utility class, ví dụ code — nằm ở **[`docs/design-system.md`](docs/design-system.md)**, file này chỉ tóm tắt quy tắc cốt lõi:

- `font-heading` (Sedgwick Ave, chỉ weight 400, `--font-heading`) — **CHỈ** dùng cho: H1 landing/trang public (Trang chủ, Về chúng tôi, Tin tức...), tiêu đề section lớn trên landing, tên món trong kết quả random (`/random`). **Không** dùng cho H1 của Hồ sơ/Cài đặt/Admin/Reviewer (dùng `font-subheading` để dễ đọc). **Không** kèm `font-bold` (tránh giả đậm xấu).
- `font-subheading` (Lexend, weight 500–700, `--font-subheading`) — mặc định cho MỌI heading (`h1`-`h6` qua `@layer base`), dùng cho H2-H4, tiêu đề card/modal, tiêu đề nhóm Hồ sơ/Cài đặt, tiêu đề dashboard Admin/Reviewer, số liệu nổi bật (stats), tiêu đề bước "cách hoạt động".
- `font-body` (Mulish, weight 400–800, `--font-body`) — mặc định `<body>`, dùng cho toàn bộ body text, nút, label, input, badge, navbar, bảng, tooltip, toast, caption.
- Class dùng chung có sẵn (Tailwind v4 `@utility` trong `globals.css`): `.text-display`, `.text-display-sm`, `.text-h2`, `.text-h3`, `.text-h4`, `.text-stat`, `.text-caption` — ưu tiên dùng lại thay vì set font/size thủ công từng chỗ.
- Không hardcode tên font rải rác — mọi nơi đều qua CSS variable + utility ở trên.

### 4.5 Ngôn ngữ thiết kế tổng thể
- Border radius: 12–20px tuỳ kích cỡ component (nút nhỏ dùng radius nhỏ hơn card lớn).
- Shadow tinh tế (subtle), không đổ bóng nặng.
- Border rõ ràng, sạch (dùng màu `Border #E5E7EB`).
- Spacing rộng rãi, thoáng.
- Card responsive, có breakpoint hợp lý cho mobile/tablet/desktop.
- Ảnh món ăn/avatar: chất lượng cao, đúng tỉ lệ, không kéo méo — luôn lấy từ Cloudinary, không dùng ảnh raw base64.
- Icon: đơn giản, liên quan chủ đề đồ ăn, nhất quán style (line icon hoặc filled icon — chọn 1 style xuyên suốt, không trộn).
- Transition/micro-interaction: mượt, tinh tế (hover, tap feedback), không lạm dụng animation nặng gây giật lag.

---

## 5. Quy trình làm việc với Claude Code

1. **Trước khi code 1 tính năng mới:** đọc `/docs` liên quan (mục 1.1) nếu có, rồi tóm tắt ngắn gọn kế hoạch (file nào sẽ tạo/sửa, luồng data đi qua đâu) trước khi bắt đầu — để dễ review.
2. **Khi sửa file có sẵn:** đọc lại toàn bộ file trước khi sửa, không đoán nội dung từ trí nhớ.
3. **Khi không chắc chắn** về: tên field data, hành vi UX cụ thể (vd: random có loại trừ kết quả vừa ra không?), route, cấu trúc schema, hoặc bất kỳ quyết định nào ảnh hưởng kiến trúc → **hỏi Ttong trước**, đưa ra tối đa 2–3 lựa chọn ngắn gọn kèm đề xuất cá nhân.
4. **Không tự ý refactor lớn** (đổi cấu trúc thư mục, đổi tên file hàng loạt, đổi schema DB) nếu không được yêu cầu.
5. Sau khi hoàn thành 1 tính năng, liệt kê ngắn gọn: file đã tạo/sửa + còn thiếu gì để hoạt động đầy đủ (vd: "cần thêm MONGODB_URI vào .env.local").
6. Không viết comment thừa thãi kiểu giải thích code hiển nhiên; chỉ comment khi logic không tự nói lên được (vd: lý do chọn thuật toán random cụ thể, lý do cấu trúc GeoJSON).

---

## 6. Việc KHÔNG được làm nếu chưa hỏi

- Cài thêm dependency mới
- Đổi cấu trúc thư mục đã quy định ở mục 2
- Thêm màu ngoài bảng màu ở mục 4.3
- Viết section/nội dung marketing không được yêu cầu
- Tạo dữ liệu món ăn mẫu để "demo cho đẹp" — nếu cần data mẫu để test UI, phải hỏi trước và ghi rõ đây là data tạm, dễ nhận diện để xoá sau (vd: field `isPlaceholder: true`).
- **Thêm/xoá/đổi tên field trong schema Mongoose đã chốt ở mục 7, thêm collection mới, hoặc đổi kiểu dữ liệu của field có sẵn**
- **Viết hoặc chạy migration script** (vd: `updateMany`, đổi cấu trúc field hàng loạt) mà chưa xác nhận
- Deploy, đổi config production, hoặc chạy lệnh có thể ảnh hưởng ra ngoài phạm vi local dev.

---

## 7. Kiến trúc Backend & Database (bản chốt tạm thời v1)

### 7.1 Stack

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Backend | Next.js API Routes (Route Handlers) | Không tách server riêng |
| Database | MongoDB Atlas (free tier / M0) | Dùng Mongoose làm ODM |
| Lưu ảnh | Cloudinary | Cho cả avatar user và ảnh món ăn — DB chỉ lưu URL, không lưu file/base64 |
| Bản đồ / định vị | Leaflet + OpenStreetMap | Miễn phí, không cần API key |
| Tìm địa chỉ | Nominatim (OSM) | Chỉ dùng cho gợi ý tìm kiếm, giới hạn ~1 request/giây, cần header `User-Agent` khi gọi từ server |
| Đăng nhập | NextAuth.js (Auth.js) + MongoDB Adapter | Xử lý cả đăng nhập email/password (Credentials Provider) và Google OAuth (Google Provider) — **Google OAuth đã tích hợp và hoạt động** |
| Icon | lucide-react | Icon set duy nhất trong toàn bộ giao diện |

**Lưu ý về NextAuth.js:** dùng MongoDB Adapter sẽ tự sinh thêm 3 collection ngoài 7 bảng đã chốt: `accounts`, `sessions`, `verification_tokens`. Đây là collection do NextAuth quản lý, **không tự sửa schema của chúng** — chỉ tương tác qua API của NextAuth. Cần env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

### 7.2 Danh sách model (7 collection)

1. **User** — email, passwordHash (**optional** — user đăng nhập qua Google sẽ không có), name, avatarUrl, phone, role, isVerified, lastLoginAt, createdAt
2. **UserProfile** — quan hệ 1-1 với User, tách riêng để User nhẹ. Gồm: userId (FK), bio, birthday, gender, favoriteCategories, dietaryTags
3. **Category** — name, slug, imageUrl, description
4. **Food** — name, categoryId (FK), description, address, **location (GeoJSON Point, bắt buộc index `2dsphere`)**, imageUrl, priceRange, tags, avgRating, ratingCount, status, createdAt, updatedAt
5. **Favorite** — bảng trung gian userId (FK) + foodId (FK), quan hệ nhiều-nhiều, tách riêng khỏi UserProfile để tránh mảng phình to
6. **History** — userId (FK, có thể null cho khách chưa đăng nhập), sessionId, foodId (FK), filterUsed, status, note, pickedAt
7. **Log** — userId (FK), action, entityType, entityId, level, ip, createdAt

> Chi tiết mở rộng, ví dụ dữ liệu thật, hoặc các quyết định nghiệp vụ liên quan đến các model này (nếu có cập nhật) nên được ghi trong `/docs`, không sửa trực tiếp bảng trên trừ khi đó là thay đổi đã chốt và xác nhận với Ttong.

### 7.3 Quy tắc riêng cho field `location` (Food)

```js
location: {
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], required: true } // LUÔN [lng, lat] — không phải [lat, lng]
}
```
- Bắt buộc tạo index: `foodSchema.index({ location: "2dsphere" })`.
- Khi thêm món mới: lấy toạ độ bằng cách cho user click lên bản đồ Leaflet (`LocationPicker`), không tự bịa toạ độ hoặc suy ra từ địa chỉ text nếu chưa có kết quả geocode thật.
- `address` (string hiển thị) và `location` (toạ độ dùng cho bản đồ + query khoảng cách) luôn đi cùng nhau, không được thiếu 1 trong 2 khi tạo Food mới.

### 7.4 Nguyên tắc mở rộng schema về sau

- **Thêm field mới / thêm collection mới:** an toàn, không cần hỏi kỹ lưỡng nhưng vẫn nên báo trước khi làm (theo mục 5.3).
- **Xoá field, đổi kiểu dữ liệu, hoặc tách 1 bảng thành nhiều bảng:** đều cần migration script và **bắt buộc hỏi + xác nhận trước khi làm**, vì ảnh hưởng data cũ.
- Ưu tiên cách tiếp cận "thêm mới" hơn "sửa đổi phá vỡ cấu trúc cũ" khi có thể.

---

*File này sẽ được cập nhật khi dự án có thêm quyết định kiến trúc mới. Nếu Claude Code thấy quy tắc nào ở đây mâu thuẫn với yêu cầu mới của Ttong, phải hỏi lại để xác nhận nên ưu tiên cái nào trước khi code. Yêu cầu công việc cụ thể luôn nằm ở prompt CLI, không nằm trong file này.*
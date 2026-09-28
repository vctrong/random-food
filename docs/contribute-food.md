# Luồng "User đề xuất món ăn / quán ăn" (cập nhật 2026-09)

> Nghiệp vụ gốc: BR-C01→C07, BR-C03/C04 (cập nhật), BR-CA01→CA09 trong [`BR_UC.md`](BR_UC.md). Schema: [`database.md`](database.md) mục 3, 4, 5, 5b.
> Trang: `/mon-an/dong-gop` · Form: `src/components/food/ContributeFoodForm.tsx` · State: `src/features/contribute-food/`.

## 1. Mục bắt buộc & tiến độ

| Mục | Bắt buộc | Ghi chú |
|---|---|---|
| Ảnh món | ✦ | 1–5 ảnh, ảnh đầu là ảnh bìa |
| Tên món | ✦ | |
| Mô tả | (nếu có) | BR-C04 cập nhật: không bắt buộc |
| Giá tham khảo | ✦ | 1 mục gồm "từ" + "đến", đến ≥ từ |
| Mức độ ăn | ✦ | ≥ 1 |
| Danh mục | ✦ | 1–3, **tính cả 1 danh mục đề xuất** |
| Quán | ✦ | 1 mục: chọn quán có sẵn, *hoặc* tên + địa chỉ quán mới |
| Vị trí trên bản đồ | (nếu có) | |
| Ảnh quán | (nếu có) | 0–3 ảnh |

- Nhãn dùng `components/ui/FieldLabel.tsx`: ✦ màu accent "thở" nhẹ → điền hợp lệ thì xoay/nở thành ✓ primary (~200ms). Có text ẩn cho screen reader; input đặt `aria-required`; hiệu ứng tắt theo `prefers-reduced-motion` / Cài đặt "Giảm chuyển động".
- Nút gửi: "Còn N mục nữa là xong ✦" → "Gửi món lên NayAnGi 🎉" (logic đếm: `features/contribute-food/formProgress.ts`, có test).

## 2. Danh mục

- Ngoài form tối đa 7 chip + "Xem tất cả (N)": danh mục **gợi ý từ tên món** (so khớp không dấu theo ranh giới từ, trả được nhiều danh mục: "Cơm chay thập cẩm" → Cơm + Chay; danh mục ghép "Chè / Tráng miệng" khớp từng phần) lên đầu, có highlight; còn lại theo `foodCount`. Logic: `features/contribute-food/categorySuggest.ts` (có test).
- "Xem tất cả": popover (desktop) / bottom sheet (mobile), tìm không dấu + chịu lỗi gõ, gom theo nhóm cha (`group`).
- Chip đã chọn nằm hàng trên cùng, có ✕. Chọn quá 3 → dòng nhắc nhẹ (aria-live), không alert.
- Danh mục "Khác" không bao giờ hiện cho user chọn.

### Đề xuất danh mục mới
- Gõ tên → gợi ý "Có phải ý bạn là **Bún** không?" (giống ≥ 70%) hoặc "Chọn **Cơm + Chay** là được nè" (tên phủ ≥ 2 danh mục có sẵn) — bấm là chọn luôn.
- Vẫn tạo mới → chip viền nét đứt + nhãn "chờ duyệt", tính là đã chọn danh mục. Tối đa 1 đề xuất/món.
- Server (`lib/foodSubmission.ts`): tên đề xuất trùng danh mục có sẵn (sau chuẩn hoá) → dùng luôn danh mục đó. Ngược lại upsert proposal pending theo `nameNormalized` (`$addToSet` người đề xuất + món, `$inc proposalCount`) và gắn `foods.proposedCategoryId`.

## 3. Duyệt đề xuất — phân quyền

| Hành động | FoodReviewer | Admin | API |
|---|:-:|:-:|---|
| Gộp vào danh mục có sẵn | ✅ (khi duyệt món) | ✅ | reviewer: `POST /api/reviewer/category-proposals/[id]` `{action:"merge", foodId, categoryId}` · admin: `POST /api/admin/category-proposals` `{decision:"merged"}` |
| Từ chối đề xuất | ✅ (khi duyệt món) | ✅ | `{action:"reject", foodId}` / `{decision:"rejected"}` |
| Tạo danh mục mới từ đề xuất (sửa tên, chọn nhóm cha) | ❌ | ✅ | chỉ `POST /api/admin/category-proposals` `{decision:"approved", name, group}` |

- Route reviewer **không có** hành động tạo; kiểm tra: đúng role (`requireReviewerSession`), món đang `pending` và đúng đang gắn đề xuất đó, không phải món do chính reviewer gửi (BR-F02).
- Mọi quyết định áp dụng cho **tất cả món** đang gắn đề xuất (UI hiện "Áp dụng cho N món đang dùng đề xuất này").
- Duyệt món khi đề xuất còn pending → món chưa có danh mục nào khác thì vào "Khác", proposal ở lại cho Admin (`lib/reviewerData.ts`).
- Gộp / tạo mới → thêm danh mục vào các món, bỏ "Khác". Từ chối → giữ danh mục khác, không còn thì "Khác". Logic: `lib/categoryProposals.ts`.
- `categories.foodCount` được tính lại sau mỗi thao tác (`lib/categoryCounts.ts`).

## 4. Chọn quán có sẵn

- `GET /api/restaurants?q=&cursor=&lat=&lng=` (`lib/restaurantSearch.ts`), chỉ quán approved + visible.
  - Không từ khoá: có vị trí (user đã cho quyền) → gần nhất (`$geoNear`), hết quán có toạ độ thì tới quán chưa có toạ độ; không vị trí → mới thêm gần đây. Trang đầu 5, mỗi lượt sau 10, cursor-based.
  - Có từ khoá: Atlas Search `restaurants_search`; lỗi hoặc trang đầu rỗng (index chưa tạo) → fallback regex `nameNormalized`/`addressNormalized` + chấm điểm `fuzzyScore` (không dấu, sai 1–2 ký tự, khớp từng phần, cả địa chỉ).
- Client: debounce 300ms, `AbortController` huỷ request cũ, infinite scroll, skeleton, tô đậm phần khớp. Không thấy quán → "Thêm quán mới: '<tên vừa gõ>'" (điền sẵn tên).
- Chỉ hỏi quyền vị trí khi user bấm "Ưu tiên quán gần tôi"; nếu trình duyệt đã cho quyền từ trước thì lấy âm thầm.

## 5. Quán mới: địa chỉ, bản đồ, ảnh

- **Đường A** — user gõ địa chỉ: chỉ geocode khi rời ô / Enter (không theo từng phím) → dời bản đồ → gợi ý "Ghim đã đúng chỗ quán chưa? Kéo bản đồ để chỉnh nếu lệch nha". Chỉ dời ghim khi user **chưa** tự ghim.
- **Đường B** — user kéo bản đồ (ghim cố định giữa, zoom quanh tâm) hoặc bấm "📍 Tôi đang ở quán này" → reverse geocode → điền ô địa chỉ; nếu user đã tự sửa ô địa chỉ thì chỉ hiện gợi ý "Dùng địa chỉ này / Giữ của tôi".
- Mobile: bản đồ nhỏ chỉ để xem, chạm để mở toàn màn hình, chỉnh xong bấm "Xác nhận vị trí".
- Mặc định ở trung tâm Cần Thơ, zoom 15 (mức phường). Có nút "Bỏ ghim".
- Hiện marker quán đã duyệt trong 300m quanh ghim; quán ≤ 50m (ưu tiên tên giống) → "Quán này có sẵn rồi phải không?" + "Chọn quán này / Không phải". Chỉ gợi ý, không chặn.
- `locationSource`: `gps` / `pin_confirmed` / `geocoded` (không đụng bản đồ, geocode được) / `none` (geocode thất bại hoặc bỏ ghim — vẫn gửi được). Logic: `features/contribute-food/locationLogic.ts` (có test).
- Màn duyệt reviewer/admin: badge độ tin cậy theo `locationSource`, bản đồ nhỏ, link "Mở trên Google Maps".

### Nominatim
Mọi request đi qua proxy Next.js (`/api/geocode`, `/api/geocode/reverse`, `lib/nominatim.ts`): User-Agent `NayAnGi/1.0 (+NOMINATIM_CONTACT_EMAIL | NEXTAUTH_URL)` + Referer, **tối đa 1 request/giây toàn hệ thống** (khoá dùng chung trong collection `rateLimits`, request sau chờ lượt tối đa 4s rồi trả 503), cache 24h trong bộ nhớ instance + cache phía client, timeout 6s, lỗi thì UI báo nhẹ và cho ghim tay.

### Ảnh (món + quán)
- Nén bằng canvas phía client (cạnh dài ≤ 1600px, JPEG 0.82) → xin chữ ký `POST /api/uploads/signature` (đăng nhập, 2 thư mục cố định `nayangi/foods`, `nayangi/restaurants`, rate limit 40/10 phút) → upload thẳng lên Cloudinary bằng XHR (có tiến độ). Kéo thả / chọn / chụp (mobile), xem trước, xoá, sắp xếp (kéo thả hoặc nút ←/→), lỗi từng ảnh + "Thử lại".
- Server chỉ nhận URL đúng cloud + đúng thư mục (`parseOwnUploadUrl`).
- Ảnh upload mang tag `unattached`; gửi form thành công thì gỡ tag.
- **Không lưu URL ảnh mặc định.** Quán không ảnh → `images: []`; hiển thị qua `components/restaurant/RestaurantImage.tsx` (fallback `public/image/default-restaurant.svg` — thay file này là đổi ảnh mặc định toàn app).

## 6. Atlas Search index — Ttong làm thủ công

1. Vào MongoDB Atlas → cluster đang dùng → tab **Atlas Search** (hoặc **Search & Vector Search**) → **Create Search Index**.
2. Chọn **JSON Editor** → Database: `random_food_test` (đúng DB trong `MONGODB_URI`) → Collection: `restaurants` → Index name: **`restaurants_search`** (phải đúng tên này).
3. Dán định nghĩa sau rồi **Create**:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        { "type": "string", "analyzer": "viFolding", "searchAnalyzer": "viFolding" },
        { "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15, "foldDiacritics": true }
      ],
      "address": [
        { "type": "string", "analyzer": "viFolding", "searchAnalyzer": "viFolding" },
        { "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15, "foldDiacritics": true }
      ],
      "moderationStatus": { "type": "token" },
      "visibility": { "type": "token" }
    }
  },
  "analyzers": [
    {
      "name": "viFolding",
      "tokenizer": { "type": "standard" },
      "tokenFilters": [{ "type": "lowercase" }, { "type": "icuFolding" }]
    }
  ]
}
```

4. Chờ trạng thái **Active** (vài phút). Không cần deploy lại — API tự dùng index khi có; chưa có/lỗi thì fallback regex. Gói M0 cho tối đa 3 search index.
5. Kiểm tra nhanh: ở form thêm món, mở "Chọn quán", gõ `hu tiue` hoặc `ninh kieu` → phải ra quán tương ứng.

## 7. Việc cần làm sau

- ~~Script dọn ảnh mồ côi~~ — đã có (2026-09): cron + `/admin/don-anh` + `npm run cleanup:images`, xem [`database.md`](database.md) mục 12b. Còn thiếu: ảnh cũ bị thay khi sửa đóng góp / xoá món chưa được gắn lại tag `unattached` (gọi `markImagesUnattached`).
- Áp dụng `CategoryPicker`, bản đồ mới và ảnh quán cho `ContributionEditModal` (sửa đóng góp `needs_revision`) — làm sau khi form chính được test xong. **Validate phía server đã áp dụng chung** (`lib/contributions.ts` dùng `validateFoodCategories`, mô tả không bắt buộc, toạ độ không bắt buộc).

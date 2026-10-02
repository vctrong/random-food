# Giờ mở cửa quán (2026-10)

> Code: hàm thuần `src/features/opening-hours/openingHours.ts` (có test) · nhập `components/restaurant/OpeningHoursField.tsx` · hiển thị `components/restaurant/OpeningHoursSummary.tsx`.
> Schema: [`database.md`](database.md) mục 3 (`restaurants.openingSchedule`).

## 1. Dữ liệu

```js
openingSchedule: { status: "unknown" }                    // "Không rõ giờ" — rõ ràng, reviewer bổ sung khi xác minh
openingSchedule: {
  status: "known",
  mode: "daily" | "weekly",                               // chỉ để form mở đúng chế độ nhanh / chi tiết
  days: [                                                  // đủ 7 phần tử, 0 = Thứ 2 … 6 = Chủ nhật
    { day: 0, closed: false, allDay: false, ranges: [{ open: "06:00", close: "10:00" }, { open: "16:00", close: "21:00" }] },
    { day: 6, closed: true,  allDay: false, ranges: [] },  // nghỉ
    { day: 5, closed: false, allDay: true,  ranges: [] },  // mở 24 giờ
  ]
}
```

- Khung có `close <= open` là **qua đêm** (18:00–02:00 đóng lúc 02:00 hôm sau; `close: "00:00"` = đóng lúc nửa đêm).
- `openingHours` (chuỗi, field cũ) **vẫn giữ**, là chuỗi tóm tắt server tự sinh (`formatOpeningSchedule`) mỗi lần ghi — các chỗ cũ đọc chuỗi không vỡ. "Không rõ giờ" thì bỏ chuỗi này.
- Đọc dữ liệu luôn qua `resolveOpeningSchedule(openingSchedule, openingHours)`: có lịch thì dùng, không thì thử đọc chuỗi cũ "HH:mm - HH:mm", cuối cùng là `unknown`.

## 2. Validate (zod `openingScheduleSchema`, dùng chung client + server)

- Giờ `HH:mm` (00:00–23:59); giờ mở ≠ giờ đóng (mở cả ngày → "Mở 24 giờ").
- Mỗi ngày: nghỉ / 24 giờ thì không có khung; còn lại 1–3 khung, không chồng nhau, tối đa 1 khung qua đêm.
- Phần qua đêm không được lấn sang giờ mở của hôm sau (hôm sau nghỉ thì được).
- Đủ 7 ngày đúng thứ tự; không được "nghỉ cả tuần" (khi đó chọn "Không rõ giờ").
- **Bắt buộc** khi user tạo quán mới: giờ hợp lệ hoặc "Không rõ giờ" (`foodSubmissionSchema`, form tính 1 mục ✦).

## 3. Nơi nhập / sửa

| Nơi | Ai | Ghi chú |
|---|---|---|
| Form đóng góp món (`/mon-an/dong-gop`), khi tạo quán mới | User | Mặc định "Giống nhau mọi ngày" |
| Form sửa đề xuất (`ContributionEditModal`) | Chủ đề xuất | Chỉ khi `pending` và là quán mới của mình (đúng quyền nhóm nặng — [`contribute-food.md`](contribute-food.md) mục 8); field form `restaurantOpeningSchedule` (JSON) |
| `FactEditPanel` (hàng chờ) | FoodReviewer đang giữ đề xuất | Dữ kiện thực tế (ngoại lệ BR-F08) — `contentEdits` |
| Xử lý báo cáo quán (`ReportCaseDetailPanel`) | Admin | `contentEdits` |

AuditLog `content_edit` ghi trước/sau dạng chuỗi tóm tắt, field `openingHours` (nhãn thông báo "giờ mở cửa" giữ nguyên).

## 4. Hiển thị & trạng thái

- `OpeningHoursSummary`: "Hằng ngày 06:00–10:00, 16:00–21:00" · "T2–T6: 06:00–21:00 · T7, CN: Mở 24 giờ" · "Chưa có giờ mở cửa". Dùng ở thẻ món đóng góp, chi tiết đề xuất, form sửa, hàng chờ reviewer, xử lý báo cáo, thẻ kết quả random.
- `getOpenStatus(schedule, now)` → `open` / `closing_soon` (≤ 30 phút) / `closed` / `unknown`, kèm `closesAt`. Tính theo giờ **Asia/Ho_Chi_Minh** (`Intl`) bất kể múi giờ máy chạy; xét hôm qua + hôm nay + mai và gộp khung nối liền (ca qua đêm, nhiều ngày 24 giờ liên tiếp). Trên giao diện chỉ tính sau khi mount (server không tính) để không lệch hydrate. Dành cho trang danh sách quán sau này.

## 5. Migration

`npm run migrate:opening-schedule` (dry-run) → `npm run migrate:opening-schedule -- --apply`. Idempotent (chỉ xử lý quán chưa có `openingSchedule`): chuỗi "HH:mm - HH:mm" → lịch hằng ngày + chuẩn hoá chuỗi tóm tắt; còn lại → `unknown` (giữ chuỗi cũ không đọc được). Script chỉ in tên DB; lỗi chỉ in tên/mã lỗi.

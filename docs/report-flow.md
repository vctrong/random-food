# Luồng Báo cáo (Report) — đánh giá, món ăn, quán ăn (2026-09)

> Nghiệp vụ: BR-M01→M14, BR-A09, BR-F08 (ngoại lệ) trong [`BR_UC.md`](BR_UC.md). Schema: [`database.md`](database.md) mục 3, 8, 10, 10b, 11, 12.
> Hằng số (lý do, ngưỡng, câu chữ): `src/constants/reports.ts`, `src/constants/infoNotice.ts`.

## 1. Phân quyền

| Việc | Guest | User | FoodReviewer | Admin |
|---|:-:|:-:|:-:|:-:|
| Gửi / hoàn tác báo cáo | ❌ (mời đăng nhập) | ✅ | ✅ | ✅ |
| Xem & xử lý case báo cáo | ❌ | ❌ | ❌ | ✅ |
| Khoá tài khoản tác giả | ❌ | ❌ | ❌ | ✅ |
| Sửa dữ kiện thực tế khi **duyệt đóng góp** (giá; địa chỉ, vị trí, giờ mở cửa) | ❌ | ❌ | ✅ | ✅ |
| Sửa toàn quyền (tên, mô tả, gỡ ảnh…) khi **xử lý báo cáo** | ❌ | ❌ | ❌ | ✅ |

Quyền kiểm ở API: `/api/admin/report-cases*`, `/api/admin/restaurants` dùng `requireAdminSession` (không phải Admin → 404); `/api/reviewer/contribution-edit` dùng `requireReviewerSession` + chặn field ngoài danh sách (`lib/contentEdits.ts`).

## 2. Phía user

**Đánh giá** (`FoodReviewsSection` → `ReviewActionsMenu`):
- Nút "⋯" cạnh dãy sao — desktop hiện khi hover/focus-within bài đánh giá, mobile luôn hiện (mờ nhẹ). Không có trên đánh giá của chính mình (`isMine` từ API).
- Menu → "Báo cáo đánh giá" → form trong cùng popover (desktop) / bottom sheet (mobile). Guest → lời mời đăng nhập (`LoginPrompt`), không redirect.
- Gửi xong: đánh giá thu gọn thành "Bạn đã báo cáo đánh giá này · Hoàn tác" + toast "Cảm ơn nha, tụi mình sẽ xem xét sớm 💙". Hoàn tác chỉ khi case còn chờ.
- `GET /api/reviews` trả thêm `isMine`, `reportedByMe`, `canUndoReport`; đánh giá đang ẩn tạm vẫn trả cho chính người đã báo cáo (để còn nút Hoàn tác).

**Món / quán** (trang chi tiết món): khối câu nhắc `INFO_NOTICE_FULL` + link "Thông tin chưa đúng? Báo cho tụi mình nha" (`PlaceReportLink`).
- Lý do nhắm vào **quán**: Quán đã đóng cửa · Sai địa chỉ/vị trí · Trùng với quán khác. Nhắm vào **món**: Sai giá · Ảnh không đúng · Khác.
- "Trùng với quán khác" → khung tìm quán ngay trong form (không lồng popover), bắt buộc chọn. "Khác" → ghi chú bắt buộc.
- Đối tượng đã báo cáo → lý do tương ứng bị khoá "đã báo cáo"; báo cáo cả món lẫn quán rồi → hiện "Bạn đã báo cáo thông tin này rồi".
- Món/quán không bị ẩn sau khi báo cáo.

**API:** `POST /api/reports` · `DELETE /api/reports` `{targetType, targetId}` · `GET /api/reports?targetType=&ids=` (logic: `lib/reports.ts`).

## 3. Chống lạm dụng (server)

- Đăng nhập; không tự báo cáo nội dung của mình; 1 lần / đối tượng (unique index); 20 lần / ngày giờ VN (`rateLimits`).
- Đánh giá đủ 3 user báo cáo → `hidden_pending_review` + tính lại điểm món. Hoàn tác tụt dưới 3 → hiện lại.
- Case gom theo đối tượng, upsert nguyên tử (unique một phần trên case `pending`).

## 4. Phía Admin — `/admin/bao-cao`

- Danh sách case: sắp `reportCount` giảm dần rồi `updatedAt`; lọc trạng thái (Đang chờ / Đã xử lý / Đã bỏ qua) và loại (Đánh giá / Món / Quán) bằng `SelectMenu`. Badge sidebar = số case đang chờ.
- Chi tiết: nội dung bị báo cáo, thống kê lý do, ghi chú từng người báo cáo (Admin thấy tên người báo cáo — tác giả thì không).
- Hành động (luôn kèm lý do — chọn nhanh từ `RESOLUTION_PRESETS` hoặc tự gõ):
  - Đánh giá: Bỏ qua (hiện lại nếu đang ẩn tạm) · Gỡ đánh giá (`status = hidden`) · Gỡ + cảnh cáo (`warningCount + 1`). Ô tác giả hiện số lần đã bị cảnh cáo + nút "Khoá tài khoản tác giả" (xác nhận, dùng lại `PATCH /api/admin/users`).
  - Món/quán: Bỏ qua · Sửa thông tin (toàn quyền, gỡ ảnh sai) · Đánh dấu đã đóng cửa (xác nhận) · Gộp quán trùng (bước 1 chọn quán gốc — gợi ý từ các báo cáo "trùng" + tìm kiếm; bước 2 modal gõ "GỘP").
  - Quán đã đóng cửa có nút "Mở lại quán" (`PATCH /api/admin/restaurants`).
- Gộp quán: chuyển `foods`, `experiences`, `reviews` sang quán gốc; quán trùng `visibility = deleted` + `mergedIntoRestaurantId`. Quán không lưu số liệu denormalized nên không có gì phải tính lại (vẫn đếm lại `categories.foodCount`). App chưa có trang quán riêng → "redirect" được làm ở tầng dữ liệu: check-in gửi id quán trùng tự ghi vào quán gốc.

## 5. Thông báo

| Người nhận | Khi | Loại | Nội dung |
|---|---|---|---|
| Người báo cáo | Gỡ đánh giá | `report_handled` | "Đánh giá bạn báo cáo đã được gỡ, cảm ơn bạn đã giúp cộng đồng 💙" |
| Người báo cáo | Sửa / đóng cửa / gộp | `report_handled` | "Thông tin bạn báo đã được cập nhật…" |
| Người báo cáo | Bỏ qua | `report_handled` | Lời cảm ơn nhẹ nhàng, giải thích nội dung vẫn phù hợp |
| Tác giả đánh giá | Bị gỡ | `review_removed` | Kèm lý do (+ số lần nhắc nhở nếu cảnh cáo), không lộ người báo cáo |
| Người đóng góp | Nội dung bị chỉnh | `content_corrected` | Liệt kê mục đã chỉnh |

⚠️ **Chưa có giao diện xem thông báo** — hiện chỉ ghi DB (chờ Ttong quyết định có xây chuông thông báo không).

## 6. Câu nhắc nhở

`src/constants/infoNotice.ts` — `INFO_NOTICE_FULL` (trang chi tiết món, ngay trên link báo cáo) và `INFO_NOTICE_SHORT` (footer). Hiển thị qua `components/ui/InfoNotice.tsx` (nền pha rất nhạt primary/accent, chữ nhỏ màu dịu, tự đổi theo dark mode).

## 7. Migration

`npm run migrate:report-flow` (dry-run) → `-- --apply`: gán `businessStatus: "open"` cho quán cũ, tạo index `reporter_target_unique`, xoá index cũ `status_1_createdAt_-1` của `reports`, tạo index `reportcases`. Dừng nếu còn báo cáo dạng cũ.

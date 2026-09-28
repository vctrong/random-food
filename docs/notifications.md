# Hệ thống Thông báo (Notification + Announcement)

> Trạng thái: **đã triển khai đủ 7 giai đoạn** (mục 11), đồng bộ theo code ngày 2026-09-28. Quyết định đã chốt với Ttong cùng ngày. Đổi code thì cập nhật file này, không suy diễn từ bản cũ.
> Liên quan: [`database.md`](database.md) mục 2, 11, 12 · [`report-flow.md`](report-flow.md) mục 5 · [`contribute-food.md`](contribute-food.md) · BR-F08, BR-M14, UC-U21, UC-N01→N03 trong [`BR_UC.md`](BR_UC.md) · mockup `example/trangthongbao/`.

## 0. Hiện trạng trước khi làm (để đối chiếu)

- Model `Notification` cũ lưu câu chữ cứng (`message`) theo `userId`, không TTL. **Dữ liệu cũ bị xoá toàn bộ, không migrate**: `npm run reset:notifications` (dry-run) → `-- --apply` — xoá bản ghi cũ + index theo `userId`, `$unset` `userProfiles.notificationPrefs`, tạo index `notifications`/`announcements`/`deviceTokens`.
- `userProfiles.notificationPrefs` (Boolean theo loại) **bị bỏ, không migrate** — thay bằng `notificationPreferences` (chỉ kênh Email).
- Badge đếm pending trên sidebar Admin (báo cáo, đề xuất danh mục, đơn reviewer) và Reviewer (hàng chờ) **đã có sẵn** — đúng yêu cầu "badge đếm trực tiếp từ DB, không tạo thông báo từng mục".
- `lib/email/mailer.ts` đã đổi tên thành `lib/email/emailService.ts` (điểm gửi email duy nhất cho mọi luồng); `lib/email/templates.ts` (layout thương hiệu, `CONTACTS`) được tái dùng cho email thông báo.

## 1. Loại thông báo & người nhận

Câu chữ **không lưu DB** — frontend dựng từ `type + payload`. Danh sách loại + quy tắc kênh: `src/constants/notifications.ts`.

| `type` | Người nhận | Điểm gọi | `payload` chính | Email |
|---|---|---|---|---|
| `food_approved` | Người đóng góp | `reviewerData.applyModerationDecision` | `targetType` (`food`/`restaurant`), `targetId`, `name`, `foodId?` (quán: món của user tại quán — để "Sửa ngay" mở đúng form) | Tuỳ chọn, mặc định **bật** |
| `food_rejected` | Người đóng góp | như trên | + `reason` | Tuỳ chọn, mặc định **bật** |
| `food_needs_revision` | Người đóng góp | như trên | + `feedback` | Tuỳ chọn, mặc định **bật** |
| `content_corrected` | Người đóng góp | `contentEdits` (Reviewer/Admin sửa giá; địa chỉ, vị trí, giờ mở cửa) | `targetType`, `targetId`, `name`, `fields[]` | Không |
| `contribution_resubmitted` | FoodReviewer đã yêu cầu sửa | User nộp lại bản sửa (`PATCH /api/contributions/[id]`) | `targetType`, `targetId`, `name` | Không |
| `category_proposal_approved` | Mọi `proposerIds` | `categoryProposals.approveProposalAsCategory` | `proposalName`, `categoryName` | Không |
| `category_proposal_rejected` | Mọi `proposerIds` | `categoryProposals.rejectProposal` | `proposalName`, `reason?` | Không |
| `category_proposal_merged` | Mọi `proposerIds` | `categoryProposals.mergeProposal` | `proposalName`, `categoryName` | Không |
| `report_handled` | Mọi người báo cáo của case | `admin/reportCases.resolveReportCase` | `caseId`, `targetType`, `outcome` (`removed`/`updated`/`dismissed`) | Không |
| `report_created` | Mọi Admin (không bị khoá) | `reports.submitReport` khi **mở case mới** (`reportCount === 1`; báo cáo thứ 2, 3… không gửi thêm) | `caseId`, `targetType` | Không |
| `content_removed` | Tác giả | Admin gỡ đánh giá (case báo cáo `reportCases`, `/admin/danh-gia` → `admin/reviews.setReviewStatus`), ẩn món-quán (`/admin/noi-dung` → `admin/content.setContentVisibility`) — chỉ khi đang hiện chuyển sang ẩn | `targetType` (`review`/`food`/`restaurant`), `targetId`, `name`, `reason?`, `warningCount?` | Tuỳ chọn, mặc định **tắt** |
| `account_banned` | User bị khoá | `admin/users.setAccountStatus` | `reason?` | **Bắt buộc** |
| `account_unbanned` | User | như trên | — | **Bắt buộc** |
| `role_changed` | User | **Chỉ** khi Admin đổi role thủ công (`admin/users.changeUserRole`) | `previousRole`, `newRole` | **Bắt buộc** |
| `reviewer_application_result` | Người nộp đơn | `admin/reviewerApplications` | `decision` (`approved`/`rejected`), `reason?` | **Bắt buộc khi `approved`** (role đổi); không email khi `rejected` |
| `password_changed` | User | đổi mật khẩu, tạo mật khẩu, liên kết mật khẩu, đặt lại qua Quên mật khẩu | `method` (`change`/`set`/`link`/`reset`) | **Bắt buộc** — trừ `reset` (luồng Quên mật khẩu đã tự gửi email xác nhận, không gửi trùng) |
| `login_failed` | User | `auth.ts` (sai mật khẩu, tài khoản đang bị khoá) | `reason` (`wrong_password`/`banned`) | **Không bao giờ** (tránh bị lợi dụng để dội mail) |

Đã bỏ: `login_success`, `system`, `review_removed` (gộp vào `content_removed`).

**Admin gỡ nội dung** ở `/admin/noi-dung` và `/admin/danh-gia`: bắt buộc nhập lý do qua `components/admin/RemovalReasonModal.tsx` (chọn nhanh `REMOVAL_REASON_PRESETS` trong `constants/admin.ts` hoặc tự gõ, ≤ 300 ký tự). API (`PATCH /api/admin/content`, `PATCH /api/admin/reviews`) từ chối ẩn khi thiếu lý do; lý do ghi vào `AuditLog.reason` và `payload.reason` của `content_removed`.

Quy tắc chung:
- Guest không có thông báo.
- Không tự thông báo cho chính mình (`recipientId === actorId` → bỏ qua).
- **`contribution_resubmitted`:** người nhận = `actorId` của bản ghi `AuditLog` `needs_revision` gần nhất trên đúng `targetId`, và người đó còn role `foodreviewer`/`admin`. Không tìm được → **bỏ qua im lặng** (mục vẫn nằm trong hàng chờ có badge).
- Thông báo liên quan báo cáo không bao giờ lộ người báo cáo (BR-M14) — `actorId` không trả ra client.

## 2. Models

### 2.1 `notifications` (`src/lib/models/Notification.ts`)

```js
{
  _id: ObjectId,
  recipientId: ObjectId,   // ref users, required
  type: "food_approved",   // enum mục 1
  actorId: ObjectId,       // optional — Reviewer/Admin gây ra sự kiện; không trả ra client
  payload: {},             // Mixed — chỉ dữ liệu (id, tên, lý do, feedback...), không câu chữ
  link: "/mon-an/<id>",    // optional — dựng ở server lúc tạo (lib/notifications/links.ts)
  isRead: false,
  readAt: ISODate,         // optional
  createdAt: ISODate
}
```
Index: `{ recipientId: 1, isRead: 1, createdAt: -1 }` · `{ recipientId: 1, _id: -1 }` (phân trang cursor) · TTL `{ createdAt: 1 }` 90 ngày.

### 2.2 `announcements` (`src/lib/models/Announcement.ts`)

```js
{
  _id: ObjectId,
  title: "Thông báo bảo trì hệ thống ngày 05/10/2026",
  slug: "bao-tri-he-thong-05-10-2026",       // unique, lowercase
  summary: "Mô tả ngắn cho thẻ danh sách, banner, dropdown chuông",   // required
  highlights: [{ label, value, note? }],     // tuỳ chọn, tối đa 3 — khối "Tóm tắt thông tin quan trọng"
  content: {},                               // TipTap JSON (Mixed); ảnh là URL Cloudinary
  type: "news" | "feature" | "maintenance" | "important",
  targetRoles: ["all"] | ["user", "foodreviewer", "admin"],   // "all" gồm cả Guest
  isPinned: false,
  status: "draft" | "published",             // CHỈ 2 giá trị — xem "trạng thái tính toán"
  publishAt: ISODate,                        // required khi published
  expireAt: ISODate,                         // optional
  createdBy: ObjectId,                       // ref users (Admin)
  viewCount: 0,
  createdAt, updatedAt
}
```
Index: `{ slug: 1 }` unique · `{ status: 1, publishAt: -1 }` · `{ isPinned: -1, publishAt: -1 }`.

**Trạng thái tính toán** (hàm thuần `lib/announcementStatus.ts`, dùng cho cả phía user lẫn trang Admin — không cron):
- `draft` → **Nháp**
- `published` + `publishAt > now` → **Đã lên lịch**
- `published` + `publishAt ≤ now` + (`expireAt` trống hoặc `> now`) → **Đang hiển thị**
- `published` + `expireAt ≤ now` → **Hết hạn**

Truy vấn "đang hiển thị" cho user = `status: "published", publishAt ≤ now, (expireAt null hoặc > now), targetRoles ∋ "all" hoặc role của user`.

**Mã bài** (vd `TB-2026/09-SYS`) tự sinh từ `publishAt` + `type`, không lưu DB.

### 2.3 `deviceTokens` (`src/lib/models/DeviceToken.ts`) — chuẩn bị, chưa dùng
`{ userId, token (unique), platform: "web"|"android"|"ios", createdAt, lastUsedAt }`. Không có API/UI ở đợt này.

### 2.4 `userProfiles` (thêm)
```js
notificationPreferences: {
  email: { food_approved: true, food_rejected: true, food_needs_revision: true, content_removed: false }
},
lastAnnouncementSeenAt: ISODate,      // mốc "Đánh dấu đã đọc hết"
readAnnouncementIds: [ObjectId]       // bài đọc lẻ sau mốc trên (bấm/mở từng bài); "đọc hết" thì dọn sạch
```
Chỉ các loại **email tuỳ chọn** có key. Loại bắt buộc/không có email được quyết định ở server (`constants/notifications.ts`), không đọc preference. Kênh Push sẽ thêm key `push` khi ra mắt. Thông báo **trong app luôn lưu và luôn hiện** — không có tuỳ chọn tắt.

## 3. Luồng trung tâm `notify()`

`src/lib/notifications/notify.ts` — service duy nhất ghi `Notification`, gọi trong service layer ngay sau khi nghiệp vụ ghi DB thành công (không dùng change stream):

```
notify(recipientId, { type, payload, actorId?, email? })
  ├─ 0. bỏ qua nếu recipientId === actorId
  ├─ 1. lưu Notification (link dựng từ type + payload)          ← luôn luôn
  ├─ 2. realtimeService.publish(private-user-{id}, "notification:new", { id, type })
  ├─ 3. sendPush(...)  (lib/notifications/pushService.ts)          ← interface, chưa triển khai (no-op)
  └─ 4. email — nếu loại bắt buộc, hoặc loại tuỳ chọn + user bật; email: false để tắt cho 1 lần gọi
```
- `notify()` **không bao giờ ném lỗi** ra nghiệp vụ chính: mọi bước trong try/catch, lỗi → `console.error` + `Log` (`notification_failed`, metadata `{ step, type }`).
- Bước 2–4 chạy song song (`Promise.allSettled`).
- `notifyMany(recipientIds, ...)`: `insertMany` rồi phát kênh cho từng người (người báo cáo, người đề xuất danh mục, Admin).
- `notifyAdmins(...)`: gửi cho mọi user role `admin`.

**File (giai đoạn 1):** `lib/notifications/notify.ts` (notify / notifyMany / notifyAdmins) · `links.ts` (dựng link) · `emailPolicy.ts` (hàm thuần quyết định gửi email) · `preferences.ts` · `inbox.ts` (danh sách, đếm, đọc, xoá) · `pushService.ts` (no-op) · `email.ts` (gửi email sau response) · `lib/realtime/realtimeService.ts` (Pusher) · `lib/announcements.ts` (đếm bài chưa xem) · test: `lib/notifications/notifications.test.ts`.

**Gộp khi hiển thị** (hàm thuần `features/notifications/groupNotifications.ts`): các thông báo liền nhau cùng `type`, cùng trạng thái đọc, cùng ngày giờ VN, thuộc loại gộp được (`food_approved`, `content_corrected`, `report_handled`, `report_created`, `category_proposal_approved`, `category_proposal_merged`) → 1 dòng "3 đóng góp của bạn đã được duyệt · 2 chưa đọc" + mở rộng xem từng mục. **Không tách nhóm theo trạng thái đọc** (nhóm `isRead` khi mọi mục đã đọc, kèm `unreadCount`). Không gộp loại có feedback/lý do riêng (kể cả `category_proposal_rejected`).

**Quy tắc "đã đọc" (chốt 2026-09-28):** bấm/mở 1 thông báo → **chỉ thông báo đó** là đã đọc. Bấm vào dòng nhóm chỉ mở/thu gọn; bấm từng mục trong nhóm mới đánh dấu mục đó. Chỉ "Đánh dấu đã đọc hết" mới đánh dấu tất cả. Nút ✓ / vuốt phải trên 1 dòng nhóm là thao tác chủ động "đánh dấu cả nhóm này".

**Câu chữ** (hàm thuần `features/notifications/notificationContent.ts`): `buildNotificationContent(type, payload)` → `{ title, body, tone, icon, actionLabel }`; `tone`/`icon` là key, component map sang token màu + icon lucide. `buildGroupTitle(type, count)` cho nhóm. Mốc Hôm nay / Tuần này (từ thứ Hai, giờ VN) / Trước đó: `groupNotifications.ts::timeSectionOf`. Test: `features/notifications/notifications.test.ts`.

## 4. Realtime (Pusher Channels)

- `src/lib/realtime/realtimeService.ts` — chỉ file này import SDK `pusher`; đổi Soketi/Ably chỉ sửa 1 chỗ. `publish()`, `authorizeChannel()`, `userChannel()`, `isRealtimeConfigured()`. Chưa cấu hình `PUSHER_*` → `publish` no-op, route xác thực trả 503 (client chuyển polling).
- Client `features/notifications/useRealtimeNotifications.ts({ userId, onNotification, onResync })` → trả chế độ `idle`/`connecting`/`realtime`/`polling`. `pusher-js` được import động (không nặng bundle khi chưa đăng nhập), cluster `ap1`, `channelAuthorization.endpoint: /api/realtime/auth`.
- `POST /api/realtime/auth` nằm sau lớp chống CSRF của `proxy.ts` (Origin phải khớp Host) — `pusher-js` gọi XHR cùng origin nên hợp lệ.
- Kênh `private-user-{userId}`; `POST /api/realtime/auth` kiểm tra session NextAuth và chỉ cho đúng kênh của chính user (sai → 403).
- Realtime chỉ gửi `{ id, type }`; client refetch dữ liệu thật từ API.
- Kết nối lại / quay lại tab / `online` → refetch danh sách + unread-count.
- Không có `NEXT_PUBLIC_PUSHER_KEY` hoặc Pusher `failed`/`unavailable` → polling `GET /api/notifications/unread-count` mỗi 60 giây (dừng khi tab ẩn).
- Announcement không bắn realtime (bài hẹn giờ không có sự kiện) — nhận ra qua refetch/polling/tải trang.

## 5. Email

- `src/lib/email/emailService.ts` — `sendEmail()` (Nodemailer + Gmail SMTP qua `SMTP_*`, `MAIL_FROM`), dùng chung cho quên mật khẩu, xác thực email và thông báo. Đổi sang Resend chỉ sửa file này. Chưa cấu hình `SMTP_HOST`: dev in email ra console server, production báo lỗi (được `notify()` ghi log, không làm hỏng nghiệp vụ).
- `lib/notifications/email.ts` — lấy email/tên người nhận, dựng `buildNotificationEmail()` (`lib/email/templates.ts`), gửi trong `after()` của Next.js (sau khi response đã trả); ngoài phạm vi request thì gửi luôn.
- Nội dung email: tiêu đề = câu chữ trong app (`buildNotificationContent`), khối nổi bật "Lý do" / "Góp ý từ đội kiểm duyệt" (luôn escape), nút hành động (link tuyệt đối từ `NEXTAUTH_URL`; mở khoá → trang đăng nhập), hộp liên hệ cho khoá tài khoản / đổi mật khẩu. Test: `lib/email/notificationEmail.test.ts`.
- Template theo layout sẵn có trong `lib/email/templates.ts` (pill thương hiệu, card 600px, nút `primary-strong`, footer `CONTACTS`); luôn escape dữ liệu người dùng; cuối email ghi lý do nhận ("Tắt trong Cài đặt → Thông báo" cho loại tuỳ chọn, "email bắt buộc về tài khoản" cho loại bắt buộc).
- Quy tắc kênh: bảng mục 1. Không có gửi mail hàng loạt (Announcement không gửi email).

## 6. Thông báo chính thức trong Tin tức

**File (giai đoạn 6):** model `lib/models/Announcement.ts` · dữ liệu `lib/announcements.ts` (truy vấn công khai theo role, CRUD Admin + zod + AuditLog) · hàm thuần `lib/announcementContent.ts` (sanitize TipTap JSON theo whitelist node/mark/attr, link chỉ `http(s)`/`mailto`/đường dẫn nội bộ, ảnh chỉ URL Cloudinary thư mục `nayangi/announcements` của app; mã bài; thời gian đọc) · `lib/announcementEditor.ts` (bộ extension TipTap dùng chung editor + render) · `lib/announcementRender.ts` (`generateHTML` từ `@tiptap/html/server`) · `lib/announcementStatus.ts` · `lib/viewerRole.ts` · UI `components/announcements/` (badge, thẻ, trang chi tiết, banner, nút chia sẻ + ghi lượt xem, `announcementProse.ts` style dùng chung) · Admin `components/admin/AnnouncementsContent.tsx`, `AnnouncementEditor.tsx`, `AnnouncementRichEditor.tsx` · test `lib/announcementContent.test.ts`.
- Nội dung lưu dạng TipTap JSON **đã sanitize lúc lưu**, render HTML ở server lúc đọc (trình duyệt không bao giờ nhận HTML do người nhập viết tay).
- **Ảnh trong bài = node TipTap `gallery`** (`lib/announcementGallery.ts`, 1 node cho mọi số lượng ảnh; `attrs.images = [{ src, alt, width, height }]`), chèn ở bất kỳ vị trí nào. Node `image` cũ (ảnh lẻ) vẫn render để bài cũ hiển thị đúng, không migration; ảnh mới luôn vào `gallery`.
  - **Tối đa 20 ảnh khác nhau / bài** (`ANNOUNCEMENT_LIMITS.imagesMax`) — kiểm cả client (modal + nút lưu) và server (`TOO_MANY_IMAGES`).
  - Hiển thị (bố cục dùng chung editor/server: `lib/media/galleryLayout.ts`): 1 ảnh giữ tỉ lệ gốc (`w-full h-auto`), quá dọc thì giới hạn chiều cao `min(80vh, 720px)` và lấp hai bên bằng chính ảnh đó làm mờ; 2 ảnh 2 cột; 3 ảnh 1 lớn + 2 nhỏ; 4 ảnh lưới 2×2; 5+ ảnh 2 trên + 3 dưới, ô cuối "+N". Ô lưới `object-cover`.
  - Tối ưu ảnh bằng URL transform Cloudinary (`c_limit,w_…,f_auto,q_auto` + `srcset`/`sizes`, `lib/media/cloudinaryUrl.ts`) — không dùng `next/image` (HTML bài render sẵn ở server; tránh quota tối ưu ảnh của Vercel Hobby).
  - Bấm ảnh → lightbox (`components/ui/Lightbox.tsx` + `components/announcements/AnnouncementLightbox.tsx`, đọc danh sách đủ từ `data-images`): xem nguyên ảnh, trước/sau, phím ←/→, vuốt ngang, "3/8", chú thích (alt), Esc để đóng.
  - Sanitize server: node `gallery` chỉ giữ ảnh Cloudinary của app thư mục `nayangi/announcements`, alt ≤ 200 ký tự, kích thước số nguyên dương; bộ rỗng bị bỏ.
- **Modal "Bộ ảnh"** (`components/admin/GalleryManagerModal.tsx`): kéo-thả / chọn nhiều / dán (Ctrl+V) ảnh; **cắt ảnh phía client trước khi upload** (`GalleryCropPanel.tsx`, thư viện `react-image-crop`; tỉ lệ Tự do / Gốc / 16:9 / 4:3 / 1:1; bỏ qua được; GIF không qua bước cắt); upload ngầm ngay (tiến độ từng ảnh, lỗi → "Thử lại"); xem trước khổ lớn đúng bố cục khi đăng; sửa alt, thay ảnh (cũng qua bước cắt), xoá (xác nhận), sắp xếp bằng kéo-thả hoặc nút ←/→; đếm "7/20" trên toàn bài. Định dạng JPG/PNG/WebP/GIF, file gốc ≤ 20MB (nén về ≤ 5MB). Bấm bộ ảnh trong editor (hoặc chọn rồi Enter) để sửa.
- **Vòng đời ảnh** (upload thẳng Cloudinary qua `/api/uploads/signature` kind `announcement` — chỉ Admin; ảnh mới mang tag `unattached`):
  - Lưu bài: ảnh trong bài → gỡ tag `unattached`. Sửa bài: ảnh cũ không còn trong bản mới → **gắn lại** tag `unattached` + context `unattached_at` (`markImagesUnattached`), trừ ảnh bài khác vẫn dùng.
  - Gỡ bài: gắn `unattached` cho mọi ảnh của bài (trừ ảnh bài khác vẫn dùng). Không xoá ngay — cron dọn ảnh xoá sau 3 ngày (xem [`database.md`](database.md) mục 12b).
  - Xoá ảnh khi đang soạn: ảnh **chưa từng nằm trong bản đã lưu** → xoá ngay qua `POST /api/admin/announcements/images/discard` (chỉ Admin, chỉ `nayangi/announcements`, còn tag `unattached`, không nằm trong bài nào đã lưu); ảnh đã có trong bản đã lưu → chỉ gỡ khỏi editor, lúc lưu xử lý như trên. Huỷ modal → xoá các ảnh vừa upload trong lần đó. Ảnh bị xoá bằng Backspace không xoá ngay (tránh Hoàn tác đưa về ảnh đã mất) — để cron dọn; nếu Hoàn tác đưa ảnh đã xoá trở lại thì form chặn lưu.
- Slug `seen`, `banner` bị cấm (trùng route con của `/api/announcements`); slug trùng tự thêm hậu tố `-2`, `-3`… khi để trống, còn tự gõ trùng thì báo lỗi.
- Đăng: "Lưu nháp" (`draft`) · "Đăng ngay" (`published`, `publishAt` = lúc lưu; bài đang đăng giữ mốc cũ) · "Hẹn giờ" (`published` + `publishAt` tương lai). Nháp chuyển sang đăng với mốc quá khứ → lấy thời điểm hiện tại.
- Route policy: `/tin-tuc/[slug]` và `/api/announcements*` công khai, trừ `/api/announcements/seen` (cần đăng nhập). Không đủ quyền xem → trang "Không tìm thấy" (noindex).
- `/tin-tuc`: lọc Tất cả / Tin tức ẩm thực / Thông báo chính thức (`?loai=tin-tuc|thong-bao`). Announcement ghim đứng đầu, nhãn "Đã ghim" + icon `Pin`.
- Chi tiết `/tin-tuc/[slug]` theo mockup `example/trangthongbao/screen.png`, **dùng token/font design system** (không dùng bảng màu Material/Plus Jakarta Sans của `DESIGN.md` mockup): breadcrumb, badge "Thông báo chính thức" + loại + mã bài, tiêu đề, dòng tác giả "Ban quản trị NayAnGi" · ngày · thời gian đọc · sao chép link / chia sẻ, khối highlights (nếu có), nội dung TipTap, chữ ký "Trân trọng, Đội ngũ NayAnGi" + ngày, khối liên hệ từ `CONTACTS`, nút quay lại, "Thông báo khác" (3 bài). **Không có con dấu.**
- Không trong `targetRoles` / chưa tới `publishAt` / hết hạn / nháp → trang "Không tìm thấy" (`notFound()`, noindex; HTTP 200 do root có `loading.tsx` stream trước — giống `/mon-an/[id]`). Admin xem trước mọi trạng thái qua `?preview=1` (có dải cảnh báo "đang xem trước", không tính lượt xem/đã đọc).
- Lượt xem: `POST /api/announcements/[slug]/view`, 1 lần / phiên trình duyệt (sessionStorage).
- Banner trang chủ cho `important`/`maintenance` đang hiển thị (bài mới nhất), đóng được; id đã đóng lưu localStorage `nayangi:dismissed-announcements`.
- Chuông: announcement đang hiển thị, hợp role, `publishAt > lastAnnouncementSeenAt` = chưa đọc → cộng vào số chuông, hiện đầu dropdown. **Đọc = bấm vào đúng bài đó**: bấm dòng thông báo chính thức trong dropdown hoặc mở trang chi tiết (đã đăng nhập, `AnnouncementReadMarker`) → `POST /api/announcements/seen { id }` → `$addToSet` vào `readAnnouncementIds` — **chỉ bài đó** là đã đọc, bài khác giữ nguyên; bài rời khỏi dropdown. "Đánh dấu đã đọc hết" → `POST` body rỗng → `lastAnnouncementSeenAt = now`, `readAnnouncementIds = []`. Chưa đọc = đang hiển thị + hợp role + `publishAt > lastAnnouncementSeenAt` + `_id ∉ readAnnouncementIds`. User chưa có mốc → dùng `users.createdAt`.
- Admin `/admin/thong-bao`: bảng + lọc trạng thái tính toán, form tạo/sửa (TipTap, bộ ảnh Cloudinary, summary, highlights, loại, đối tượng, ghim, Lưu nháp / Đăng ngay / Hẹn giờ, hết hạn), xem trước, gỡ (xác nhận), lượt xem. Ghi `AuditLog`: `announcement_create` · `announcement_update` · `announcement_publish` · `announcement_delete`, `targetType: "announcement"`.

## 7. API

Mọi route kiểm tra quyền ở server; route Admin dùng `requireAdminSession` (không phải Admin → 404).

| Method | Route | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/notifications?cursor=&limit=20&unread=1` | User | Danh sách, cursor theo `_id` giảm dần → `{ items, nextCursor }` |
| GET | `/api/notifications/unread-count` | User | `{ notifications, announcements, total, pending }` — `pending = { reviewQueue, reportCases }` cho FoodReviewer/Admin (badge menu, `reportCases` chỉ Admin), `null` với user thường |
| PATCH | `/api/notifications` | User | `{ ids: string[] }` hoặc `{ all: true }` → đánh dấu đã đọc |
| DELETE | `/api/notifications` | User | `{ ids: string[] }` — chỉ xoá của chính mình |
| GET/PATCH | `/api/notifications/preferences` | User | `{ email: { <type>: boolean } }` — server chỉ nhận key thuộc loại email tuỳ chọn |
| POST | `/api/realtime/auth` | User | Xác thực private channel |
| GET | `/api/announcements` | Công khai theo role | Danh sách đang hiển thị (≤ 50), ghim trước rồi mới nhất |
| GET | `/api/announcements/[slug]` | Công khai theo role | Chi tiết |
| GET | `/api/announcements/banner` | Công khai | Banner important/maintenance |
| POST | `/api/announcements/[slug]/view` | Công khai | Tăng lượt xem |
| POST | `/api/announcements/seen` | User | `{ id }` — chỉ bài đó là đã đọc; body rỗng `{}` = đọc hết |
| GET | `/api/announcements?unseen=1` | User | Bài chưa xem (≤ 5) cho dropdown chuông |
| GET/POST | `/api/admin/announcements` | Admin | Danh sách / tạo |
| GET/PATCH/DELETE | `/api/admin/announcements/[id]` | Admin | Chi tiết / sửa / gỡ |
| POST | `/api/admin/announcements/images/discard` | Admin | `{ url }` — xoá ngay ảnh vừa upload rồi bỏ (chỉ ảnh chưa từng lưu) |
| GET | `/api/admin/media/orphans` | Admin | Ảnh rác hiện tại (Cloudinary Search API) |
| POST | `/api/admin/media/cleanup` | Admin | 1 lượt dọn: `{ runId?, publicIds (≤100) }` hoặc `{ runId?, all: true }` |
| GET | `/api/admin/media/cleanup-runs` | Admin | Lịch sử dọn ảnh |
| GET | `/api/cron/cleanup-images` | Vercel Cron | `Authorization: Bearer <CRON_SECRET>`, sai/thiếu → 401 |

Client gọi qua `services/notificationService.ts`, `services/announcementService.ts`, `services/mediaCleanupService.ts`.

## 8. UI/UX

**File (giai đoạn 5):** `components/notifications/` — `NotificationCenterProvider.tsx` (context bọc app trong `app/layout.tsx`: số chưa đọc, ~12 thông báo gần nhất, nối `useRealtimeNotifications`, bắn toast có link khi có tín hiệu mới — trừ khi đang ở `/thong-bao`), `NotificationBell.tsx` (+ `NotificationSkeleton`), `NotificationCard.tsx` (dùng chung dropdown/trang; nhóm mở rộng được; vuốt chỉ bật dưới `md`), `NotificationsPageContent.tsx`, `notificationVisuals.ts` (icon lucide + class màu theo tông). Trang `app/thong-bao/page.tsx` (noindex; chưa đăng nhập → `RequireLoginState`, proxy cũng tự chuyển hướng đăng nhập). `ToastOptions.action` (link trong toast). `Toggle` thêm `disabled`. `ContributionsPageContent` đọc `?edit=<foodId>` → mở `ContributionEditModal` (đã hiện góp ý của Reviewer), rồi bỏ query khỏi URL; không còn sửa được → toast báo. Badge pending: chấm trên avatar + số cạnh "Quản trị hệ thống"/"Không gian thẩm định" trong `UserMenu`.

- **Chuông** (`components/notifications/NotificationBell.tsx`, trong `Header` khi đăng nhập): badge `accent-strong` (`99+`), lắc nhẹ khi có mới (tắt khi `prefers-reduced-motion`); dropdown desktop / `BottomSheet` mobile, ~10 mục đã gộp, "Đánh dấu đã đọc hết", "Xem tất cả".
- **`/thong-bao`**: Tất cả / Chưa đọc; nhóm Hôm nay / Tuần này / Trước đó; icon + màu theo loại chỉ bằng token thương hiệu; nút hành động trong thẻ ("Sửa ngay" → `/dong-gop?edit=<foodId>` mở thẳng `ContributionEditModal` kèm feedback, "Xem món", "Mở hàng chờ"…); vuốt trên mobile (phải = đã đọc, trái = xoá) có nút thay thế cho bàn phím; empty state giọng "tui"; skeleton; "Tải thêm".
- **Toast** realtime qua `ToastProvider` có sẵn, góc màn hình, không chặn.
- **Cài đặt → Thông báo**: bảng loại × kênh **Email / Push**. Push disabled + "Sắp ra mắt". Dòng bắt buộc: icon `Lock` + giải thích. Dòng không có email: ghi "Chỉ trong app". Ghi chú kiểm tra hộp thư Spam.
- Badge pending cạnh mục "Kiểm duyệt"/"Quản trị" trong menu tài khoản trên header.
- Light/dark qua token; responsive; animation ngắn, chỉ opacity/transform.

## 9. Biến môi trường mới

| Biến | Phía | Ý nghĩa |
|---|---|---|
| `PUSHER_APP_ID` | server | App ID của app Channels |
| `PUSHER_KEY` | server | Key |
| `PUSHER_SECRET` | server | Secret — không bao giờ có tiền tố `NEXT_PUBLIC_` |
| `PUSHER_CLUSTER` | server | `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | client | = `PUSHER_KEY` |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | client | `ap1` |

SMTP dùng lại `SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM` (đã có từ luồng Quên mật khẩu). Link trong email thông báo dựng từ `NEXTAUTH_URL` — trên production phải là domain thật (vd `https://nayangi.io.vn`). Hướng dẫn lấy giá trị: `.env.example` + báo cáo cuối giai đoạn 7.

## 10. Package mới (đã duyệt)

`pusher`, `pusher-js`, `@tiptap/react`, `@tiptap/pm` (phụ thuộc bắt buộc), `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/html` (render HTML ở server).

## 11. Tiến độ

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Models, `notify()`, API thông báo + tuỳ chọn, thay các lời gọi cũ | ✅ |
| 2 | Điểm gọi mới + dựng nội dung + test gộp | ✅ |
| 3 | Email | ✅ |
| 4 | Realtime | ✅ |
| 5 | UI thông báo + Settings | ✅ |
| 6 | Announcement | ✅ |
| 7 | Kiểm thử, `.env.example`, báo cáo | ✅ |

## 12. Kiểm thử

- Unit test (vitest, `npm test`): `lib/notifications/notifications.test.ts` (quy tắc email, link, trạng thái announcement), `features/notifications/notifications.test.ts` (câu chữ 17 loại, gộp, mốc thời gian giờ VN), `lib/email/notificationEmail.test.ts` (template + escape), `lib/announcementContent.test.ts` (sanitize chống XSS/ảnh ngoài, render, mã bài), `lib/route-policy.test.ts` (route công khai mới).
- `tsc --noEmit`, `eslint .`, `next build` sạch (2026-09-28).
- Smoke test HTTP: route mới trả đúng 401/403/404 khi chưa đăng nhập / sai quyền / thiếu Origin (CSRF).
- **Chưa tự kiểm thử được** (cần tài khoản thật + dịch vụ ngoài): gửi email SMTP thật, realtime Pusher thật, toàn bộ luồng UI khi đăng nhập — xem checklist trong báo cáo cuối.

## 13. Giới hạn đã biết / để sau

- Push (web/mobile) chưa triển khai — `deviceTokens` + `pushService` chỉ là chỗ cắm sẵn; cột Push trong Cài đặt "Sắp ra mắt".
- Email gửi lỗi (SMTP down) chỉ ghi `Log` `notification_failed`, **không tự gửi lại**.
- Announcement không bắn realtime — số trên chuông cập nhật khi quay lại tab / polling 60s / tải trang.
- `/thong-bao` chỉ liệt kê thông báo cá nhân; thông báo chính thức nằm ở chuông + `/tin-tuc`.
- Lượt xem tính 1 lần / phiên trình duyệt + giới hạn 60 lượt / 10 phút / IP — không phải đếm người duy nhất.
- Gỡ bài / bỏ ảnh khỏi bài không xoá ảnh ngay — gắn lại tag `unattached`, cron `/api/cron/cleanup-images` xoá sau 3 ngày. Gỡ/ẩn nội dung ẩm thực (món, quán) **chưa** gắn lại tag cho ảnh cũ — xem [`database.md`](database.md) mục 12b "Việc cần làm sau".
- Model Mongoose khai báo `models.X ?? model(...)` → **đổi schema phải khởi động lại `npm run dev`** (hot reload giữ schema cũ).

import { NextResponse } from "next/server";

/**
 * 404 tối giản cho API — dùng ở LỚP 2 (route handler) khi phát hiện thiếu
 * quyền ở khu vực fail-as-404 (/api/admin/**). Không có body/message đặc
 * trưng ("Không có quyền", "Unauthorized"...) để không lộ sự khác biệt so với
 * gọi vào 1 path thật sự không tồn tại.
 *
 * Trong vận hành bình thường, `src/proxy.ts` (lớp 1) đã chặn và rewrite sang
 * path không tồn tại TRƯỚC KHI request tới được route handler — hàm này chỉ là
 * lớp phòng thủ dự phòng nếu proxy bị bỏ qua (đổi matcher, bug, bypass...).
 * Không dùng notFound() của next/navigation ở đây vì đó là cơ chế cho React
 * Server Component/Page, không áp dụng cho Route Handler.
 */
export function apiNotFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

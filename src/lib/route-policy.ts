/**
 * Chính sách phân quyền route tập trung — pure function, không import
 * next/server hay bất kỳ Node/Edge API nào để dễ unit test (route-policy.test.ts)
 * và để proxy.ts chỉ còn việc "đọc request → gọi hàm này → dịch quyết định
 * thành NextResponse". Đây là LỚP 1 (nhanh, chỉ dựa vào JWT đã giải mã, không
 * đụng DB). LỚP 2 (DB, xác thực cuối cùng — role/ban/idle mới nhất) nằm ở
 * requireAdminSession()/requireReviewerSession() và callback session() của
 * NextAuth — proxy KHÔNG phải điểm chặn duy nhất.
 *
 * Default-deny: bất kỳ route nào không nằm trong PUBLIC_PAGES/PUBLIC_APIS và
 * không khớp khu vực admin/reviewer đều mặc định yêu cầu đăng nhập. Điều này
 * đảm bảo route MỚI thêm sau này mà quên khai báo vẫn an toàn theo mặc định.
 */

export interface RoutePolicyToken {
  id?: string | null;
  role?: string | null;
}

export type RoutePolicyDecision =
  | { kind: "allow" }
  /** Admin: fail-as-404 — không phân biệt lý do (chưa login/sai role/ban/…). */
  | { kind: "notFound" }
  /** Page cần login: redirect kèm callbackUrl đã được chuẩn hoá an toàn. */
  | { kind: "redirectLogin"; callbackUrl: string }
  /** API cần login nhưng chưa có token. */
  | { kind: "unauthorized" }
  /** API bị nghi ngờ CSRF (Origin không khớp Host trên method thay đổi dữ liệu). */
  | { kind: "forbiddenOrigin" };

export interface RoutePolicyInput {
  pathname: string;
  method: string;
  /** Token đã giải mã từ getToken() — null nếu chưa đăng nhập HOẶC đọc token lỗi (fail closed). */
  token: RoutePolicyToken | null;
  /** Header Origin của request, null nếu không có. */
  origin: string | null;
  /** Header Host (ưu tiên X-Forwarded-Host) của request. */
  host: string | null;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Trang public — không cần đăng nhập. Dùng exact-match (không có route [dynamic] nào trong app). */
const PUBLIC_PAGES = new Set([
  "/",
  "/mon-an",
  "/random",
  "/ve-chung-toi",
  "/tin-tuc",
  "/dang-nhap",
  "/dang-ky",
  "/cai-dat", // hoạt động cho cả guest, chỉ ẩn phần cần tài khoản ở tầng UI
]);

/** API public — không cần đăng nhập. GET là chủ yếu; các method khác trên cùng path (vd POST /api/foods) vẫn tự 401 trong route handler (lớp 2). */
const PUBLIC_APIS = new Set([
  "/api/foods",
  "/api/categories",
  "/api/articles",
  "/api/restaurants",
  "/api/auth/register",
  // GET công khai (danh sách review của 1 món); POST vẫn tự 401 trong route
  // handler (lớp 2) đúng pattern /api/foods — CSRF (bước 3) vẫn áp dụng trước đó.
  "/api/reviews",
]);

/** Path tĩnh dưới /mon-an/ KHÔNG phải id món (route riêng, có chính sách quyền khác) — không được lọt qua public detail page. */
const MON_AN_STATIC_SUBPATHS = new Set(["dong-gop"]);

/**
 * Trang chi tiết món /mon-an/[id] — công khai như /mon-an (list) và /api/foods,
 * chỉ loại trừ các path tĩnh đã biết (vd /mon-an/dong-gop vẫn cần đăng nhập).
 * food.id luôn là ObjectId Mongo nên không đụng tên với path tĩnh thật.
 */
function isFoodDetailPage(pathname: string): boolean {
  if (!pathname.startsWith("/mon-an/")) return false;
  const segment = pathname.slice("/mon-an/".length).split("/")[0];
  return segment.length > 0 && !MON_AN_STATIC_SUBPATHS.has(segment);
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isReviewerPage(pathname: string): boolean {
  return pathname === "/reviewer" || pathname.startsWith("/reviewer/");
}

function isReviewerApi(pathname: string): boolean {
  return pathname === "/api/reviewer" || pathname.startsWith("/api/reviewer/");
}

function isNextAuthApi(pathname: string): boolean {
  return pathname.startsWith("/api/auth/");
}

/** So khớp Origin header với Host — CSRF theo pattern Next.js khuyến nghị cho Server Actions (data-security guide). */
function isSameOriginAsHost(origin: string, host: string): boolean {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isCsrfSuspicious(pathname: string, method: string, origin: string | null, host: string | null): boolean {
  if (!pathname.startsWith("/api/") || !MUTATING_METHODS.has(method.toUpperCase())) return false;
  // Thiếu Origin cũng bị từ chối — request hợp lệ từ trình duyệt hiện đại luôn
  // gửi Origin cho method non-safe, kể cả same-origin.
  return !host || !origin || !isSameOriginAsHost(origin, host);
}

export function evaluateRoute({ pathname, method, token, origin, host }: RoutePolicyInput): RoutePolicyDecision {
  const isAuthenticated = Boolean(token?.id);
  const isAdmin = isAuthenticated && token?.role === "admin";

  // 1. NextAuth nội bộ — luôn mở, không được đụng vào (đăng nhập/đăng xuất/callback OAuth).
  if (isNextAuthApi(pathname)) {
    return { kind: "allow" };
  }

  // 2. Admin — fail-as-404 PHẢI xét TRƯỚC CSRF: nếu không phải admin, luôn
  //    notFound bất kể Origin/Host — tránh lộ qua 1 status khác (403 CSRF) rằng
  //    route /api/admin/** có tồn tại. Chỉ khi đã xác nhận là admin thật mới
  //    xét tiếp CSRF cho method thay đổi dữ liệu.
  if (isAdminPath(pathname)) {
    if (!isAdmin) return { kind: "notFound" };
    return isCsrfSuspicious(pathname, method, origin, host) ? { kind: "forbiddenOrigin" } : { kind: "allow" };
  }

  // 3. CSRF cho phần /api/** còn lại (reviewer + route thường).
  if (isCsrfSuspicious(pathname, method, origin, host)) {
    return { kind: "forbiddenOrigin" };
  }

  // 4. Reviewer (page) — chỉ gác đăng nhập; sai role vẫn vào được để layout tự hiển thị EmptyState (BR đã chốt).
  if (isReviewerPage(pathname)) {
    return isAuthenticated ? { kind: "allow" } : { kind: "redirectLogin", callbackUrl: pathname };
  }

  // 5. Reviewer (api) — chỉ gác đăng nhập; sai role do route handler tự trả 403.
  if (isReviewerApi(pathname)) {
    return isAuthenticated ? { kind: "allow" } : { kind: "unauthorized" };
  }

  // 6. Public.
  if (PUBLIC_PAGES.has(pathname) || PUBLIC_APIS.has(pathname) || isFoodDetailPage(pathname)) {
    return { kind: "allow" };
  }

  // 7. Default-deny: mọi route còn lại (kể cả route mới quên khai báo) đều cần đăng nhập.
  if (pathname.startsWith("/api/")) {
    return isAuthenticated ? { kind: "allow" } : { kind: "unauthorized" };
  }
  return isAuthenticated ? { kind: "allow" } : { kind: "redirectLogin", callbackUrl: pathname };
}

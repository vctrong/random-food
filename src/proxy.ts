import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { evaluateRoute, type RoutePolicyToken } from "@/lib/route-policy";
import { sanitizeCallbackUrl } from "@/lib/safe-redirect";

/**
 * Lớp bảo vệ route tập trung — LỚP 1 (nhanh, chỉ đọc JWT qua getToken(), KHÔNG
 * import mongoose/bcrypt dù Next 16 cho phép Node runtime ở đây — cố tình giữ
 * ranh giới rõ với lớp 2 DB-backed ở requireAdminSession()/requireReviewerSession()
 * và callback session() của NextAuth, vốn mới là nguồn xác thực role/ban/idle
 * cuối cùng). KHÔNG phải điểm chặn duy nhất — mọi route nhạy cảm vẫn tự kiểm
 * tra lại quyền ở server component/route handler.
 *
 * Path không tồn tại thật trong app/ — rewrite tới đây để Next.js tự render
 * 404 mặc định (không route nào khớp), giống hệt gõ nhầm URL. Không tự viết
 * body 404 riêng để tránh lệch với response 404 thật của Next.js.
 */
const NOT_FOUND_PAGE_SENTINEL = "/__nayangi_not_found__";
const NOT_FOUND_API_SENTINEL = "/api/__nayangi_not_found__";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Fail closed: lỗi giải mã token (secret sai, cookie hỏng, hết hạn không hợp
  // lệ...) coi như chưa đăng nhập — không throw, không để lọt qua.
  let token: RoutePolicyToken | null = null;
  try {
    token = (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })) as RoutePolicyToken | null;
  } catch {
    token = null;
  }

  const decision = evaluateRoute({
    pathname,
    method: request.method,
    token,
    origin: request.headers.get("origin"),
    // Ưu tiên X-Forwarded-Host khi chạy sau reverse proxy/CDN; fallback Host cho dev.
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  });

  switch (decision.kind) {
    case "allow":
      return NextResponse.next();

    case "notFound": {
      const isApi = pathname.startsWith("/api/");
      const destination = new URL(isApi ? NOT_FOUND_API_SENTINEL : NOT_FOUND_PAGE_SENTINEL, request.url);
      return NextResponse.rewrite(destination, { status: 404 });
    }

    case "redirectLogin": {
      const loginUrl = new URL("/dang-nhap", request.url);
      loginUrl.searchParams.set("callbackUrl", sanitizeCallbackUrl(decision.callbackUrl + search));
      return NextResponse.redirect(loginUrl);
    }

    case "unauthorized":
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    case "forbiddenOrigin":
      return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });

    default:
      return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Chạy proxy cho mọi request TRỪ:
     * - _next/static, _next/image: asset nội bộ Next.js
     * - bất kỳ path nào có phần mở rộng file ở cuối (favicon.png, logo trong
     *   /image/**, google*.html để xác minh Search Console, robots.txt...) —
     *   khái quát hoá thay vì liệt kê từng file tĩnh trong public/.
     * VẪN bao phủ /api/** và /admin/** vì hai nhóm này không có phần mở rộng file.
     */
    "/((?!_next/static|_next/image|.*\\.[\\w]+$).*)",
  ],
};

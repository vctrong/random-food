import { isGuestOnlyPage } from "@/lib/route-policy";

/**
 * Chống open-redirect: chỉ chấp nhận `callbackUrl` là đường dẫn NỘI BỘ tuyệt đối
 * (bắt đầu bằng "/", không phải "//" hay "/\" — cả hai đều được trình duyệt hiểu
 * là host khác — và không chứa scheme kiểu "javascript:"/"https:"). Mọi giá trị
 * không hợp lệ đều fallback về "/". Dùng cả ở proxy.ts (khi build redirect tới
 * /dang-nhap) lẫn ở LoginForm/RegisterForm (khi đọc lại searchParams).
 */
export function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/";
  }

  if (!decoded.startsWith("/")) return "/";
  if (decoded.startsWith("//")) return "/"; // protocol-relative → host khác
  if (decoded.startsWith("/\\")) return "/"; // 1 số trình duyệt hiểu \ như /
  if (/^\/\s*[/\\]/.test(decoded)) return "/"; // "/ /evil.com", "/ \evil.com" sau khi trim khoảng trắng đầu
  if (/[\x00-\x1f]/.test(decoded)) return "/"; // chặn ký tự điều khiển (tab/newline) mà trình duyệt bỏ qua khi phân giải scheme

  return decoded;
}

/**
 * Đích chuyển tới sau khi đăng nhập/đăng ký (BR-S09): callbackUrl đã qua
 * sanitizeCallbackUrl; nếu nó lại trỏ về trang chỉ-dành-cho-khách (vd
 * callbackUrl=/dang-nhap) thì về "/" để không đá qua đá lại giữa các trang auth.
 */
export function resolvePostLoginRedirect(raw: string | null | undefined): string {
  const safe = sanitizeCallbackUrl(raw);
  const pathname = safe.split(/[?#]/)[0];
  return isGuestOnlyPage(pathname) ? "/" : safe;
}

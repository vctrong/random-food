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

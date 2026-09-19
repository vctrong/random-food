import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP ở chế độ Report-Only (chưa enforce) — lý do:
 * - Ứng dụng đang trộn static (/dang-nhap, /dang-ky, /ve-chung-toi) và dynamic
 *   rendering. CSP dùng nonce (khuyến nghị chính thức của Next.js) bắt buộc
 *   MỌI page phải dynamic-render, nghĩa là phải bỏ static optimization của các
 *   trang trên — một đánh đổi hiệu năng không nằm trong phạm vi yêu cầu lần này.
 * - Report-Only cho phép quan sát vi phạm thực tế (qua báo cáo trình duyệt gửi
 *   console, không cần report-uri) mà không làm hỏng bất kỳ chức năng nào, rồi
 *   mới chuyển sang enforce (`Content-Security-Policy`) sau khi đã xác nhận sạch.
 * - script-src vẫn cần 'unsafe-inline' vì không dùng nonce (Next.js tự chèn 1 số
 *   inline script cho hydration khi không có nonce); 'unsafe-eval' chỉ bật ở dev
 *   (React dùng eval để dựng lại stack trace lỗi phía server — không cần ở production).
 */
const cspReportOnlyHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://picsum.photos https://*.tile.openstreetmap.org;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  // HTTPS bắt buộc trong 2 năm, áp dụng cả subdomain — vô hại ở dev (http, trình duyệt bỏ qua).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Trùng lặp có chủ đích với CSP frame-ancestors — X-Frame-Options cho trình duyệt cũ chưa hiểu CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Tắt hết các quyền trình duyệt không dùng tới (không có tính năng camera/mic/geolocation nào trong app).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnlyHeader },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/env";

/**
 * Chặn API và các trang cần đăng nhập/theo role (khớp src/lib/route-policy.ts).
 * CỐ Ý không liệt kê /admin: khu admin trả 404 cho người không phải admin để giấu
 * sự tồn tại (fail-as-404) — ghi vào robots.txt công khai sẽ làm lộ đường dẫn.
 * Admin được chặn index bằng metadata noindex ở src/app/admin/layout.tsx.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/lich-su",
        "/da-luu",
        "/cai-dat",
        "/ho-so",
        "/dong-gop",
        "/mon-an/dong-gop",
        "/ung-tuyen-reviewer",
        "/reviewer",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

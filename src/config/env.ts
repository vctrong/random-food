/**
 * URL gốc công khai của site — dùng cho sitemap.xml, robots.txt (URL tuyệt đối).
 * Đặt NEXT_PUBLIC_SITE_URL trong .env.local / môi trường deploy; không có thì dùng domain chính thức.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nayangi.io.vn").replace(/\/+$/, "");

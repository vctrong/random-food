type ClassValue = string | number | boolean | null | undefined;

/** Nối class name, bỏ qua giá trị falsy. Không dùng clsx/tailwind-merge để tránh thêm dependency. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPriceRange(min: number, max: number): string {
  const formatter = new Intl.NumberFormat("vi-VN");
  if (min === max) return `${formatter.format(min)}đ`;
  return `${formatter.format(min)} - ${formatter.format(max)}đ`;
}

export function formatCalories(kcal: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(kcal)} kcal`;
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const date = new Date(isoTimestamp);
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_TIME_FORMATTER.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_TIME_FORMATTER.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return RELATIVE_TIME_FORMATTER.format(diffDays, "day");
}

export function formatClockTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h${minutes}p` : `${hours}h`;
}

/**
 * Link mở thẳng vị trí trên Google Maps (không cần API key — chỉ là URL điều hướng
 * công khai). Ưu tiên toạ độ chính xác nếu có, fallback về tìm theo địa chỉ text.
 */
const ALLOWED_IMAGE_HOSTS = new Set(["picsum.photos", "lh3.googleusercontent.com", "res.cloudinary.com"]);

/**
 * next/image chỉ cho phép host đã khai báo trong next.config.ts (remotePatterns) —
 * ảnh từ host khác (vd dữ liệu test/legacy) sẽ làm crash cả trang. Dùng để lọc
 * trước khi render <Image>, fallback về avatar chữ cái đầu nếu host lạ.
 */
export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return ALLOWED_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function getGoogleMapsUrl(
  location: { lat: number; lng: number } | null | undefined,
  address: string,
): string {
  const query = location ? `${location.lat},${location.lng}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

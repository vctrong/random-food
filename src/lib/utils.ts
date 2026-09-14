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

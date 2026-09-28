import { REVIEW_CREATE_WINDOW_HOURS, REVIEW_EDIT_WINDOW_HOURS } from "@/constants/limits";

/** Hàm thuần tính thời hạn đánh giá — dùng chung server (chặn thật) và client (hiện bộ đếm). */

const HOUR_MS = 60 * 60 * 1000;
export const REVIEW_EDIT_WINDOW_MS = REVIEW_EDIT_WINDOW_HOURS * HOUR_MS;
export const REVIEW_CREATE_WINDOW_MS = REVIEW_CREATE_WINDOW_HOURS * HOUR_MS;

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Số ms còn lại của 1 cửa sổ thời gian bắt đầu từ `start`; 0 nếu đã hết (hoặc mốc không hợp lệ). */
export function getRemainingMs(start: string | Date, windowMs: number, now: number = Date.now()): number {
  const startMs = toMs(start);
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, startMs + windowMs - now);
}

/** Còn được viết review cho lần check-in này không (72h kể từ lúc check-in). */
export function getCreateReviewRemainingMs(checkInAt: string | Date, now: number = Date.now()): number {
  return getRemainingMs(checkInAt, REVIEW_CREATE_WINDOW_MS, now);
}

/** Còn được sửa review không (24h kể từ lúc tạo review). Cũng là mốc phân biệt xoá thật / xoá mềm. */
export function getEditReviewRemainingMs(reviewCreatedAt: string | Date, now: number = Date.now()): number {
  return getRemainingMs(reviewCreatedAt, REVIEW_EDIT_WINDOW_MS, now);
}

/** "2 ngày 5 giờ" / "3 giờ 12 phút" / "12 phút" / "dưới 1 phút" — làm tròn xuống theo phút. */
export function formatRemainingTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "dưới 1 phút";

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  return `${minutes} phút`;
}

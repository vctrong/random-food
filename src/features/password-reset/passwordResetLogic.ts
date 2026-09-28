import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";

/** Hàm thuần cho luồng Quên mật khẩu — không I/O, dùng chung server + client, có unit test. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

/** "trong@gmail.com" → "tr***@gmail.com". Phần trước @ ≤ 2 ký tự thì chỉ giữ 1 ký tự. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***${email.slice(at)}`;
}

export interface SendPolicy {
  cooldownMs: number;
  maxPerWindow: number;
  windowMs: number;
}

export const OTP_SEND_POLICY: SendPolicy = {
  cooldownMs: PASSWORD_RESET_CONFIG.resendCooldownMs,
  maxPerWindow: PASSWORD_RESET_CONFIG.maxOtpSendsPerHour,
  windowMs: PASSWORD_RESET_CONFIG.otpSendWindowMs,
};

export const UNLOCK_EMAIL_SEND_POLICY: SendPolicy = {
  cooldownMs: PASSWORD_RESET_CONFIG.unlockEmailCooldownMs,
  maxPerWindow: PASSWORD_RESET_CONFIG.maxUnlockEmailsPerHour,
  windowMs: 60 * 60 * 1000,
};

/** Chỉ giữ các lần gửi còn nằm trong cửa sổ trượt, sắp xếp tăng dần. */
export function recentSends(history: readonly Date[], now: number, policy: SendPolicy): Date[] {
  return history
    .filter((sentAt) => now - sentAt.getTime() < policy.windowMs)
    .sort((a, b) => a.getTime() - b.getTime());
}

export type SendAllowance =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "hourlyLimit"; retryAfterMs: number };

/** Giới hạn theo giờ được xét trước cooldown — báo đúng lý do chờ lâu hơn. */
export function evaluateSendAllowance(history: readonly Date[], now: number, policy: SendPolicy): SendAllowance {
  const recent = recentSends(history, now, policy);
  if (recent.length >= policy.maxPerWindow) {
    return { allowed: false, reason: "hourlyLimit", retryAfterMs: recent[0].getTime() + policy.windowMs - now };
  }
  const last = recent[recent.length - 1];
  if (last && now - last.getTime() < policy.cooldownMs) {
    return { allowed: false, reason: "cooldown", retryAfterMs: last.getTime() + policy.cooldownMs - now };
  }
  return { allowed: true };
}

export function sendsRemaining(history: readonly Date[], now: number, policy: SendPolicy): number {
  return Math.max(0, policy.maxPerWindow - recentSends(history, now, policy).length);
}

/** Mốc sớm nhất được gửi lại (ms epoch) — now nếu gửi được ngay. */
export function nextSendAvailableAt(history: readonly Date[], now: number, policy: SendPolicy): number {
  const allowance = evaluateSendAllowance(history, now, policy);
  return allowance.allowed ? now : now + allowance.retryAfterMs;
}

export function attemptsLeft(attempts: number, maxAttempts: number = PASSWORD_RESET_CONFIG.maxOtpAttempts): number {
  return Math.max(0, maxAttempts - attempts);
}

export function isOtpFormat(value: string): boolean {
  return new RegExp(`^\\d{${PASSWORD_RESET_CONFIG.otpLength}}$`).test(value);
}

/** Token mở khoá/reset = 32 byte ngẫu nhiên dạng hex. Sai định dạng thì khỏi truy vấn DB. */
export function isOpaqueTokenFormat(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export interface PasswordCheck {
  id: "length" | "letter" | "number" | "special";
  label: string;
  passed: boolean;
}

/** Khớp đúng chính sách ở lib/password.ts (≥ 8 ký tự, có chữ, số, ký tự đặc biệt). */
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { id: "length", label: "Tối thiểu 8 ký tự", passed: password.length >= 8 },
    { id: "letter", label: "Có chữ cái", passed: /[A-Za-z]/.test(password) },
    { id: "number", label: "Có chữ số", passed: /\d/.test(password) },
    { id: "special", label: "Có ký tự đặc biệt", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** Điểm 0-4 chỉ để gợi ý UX (không thay chính sách): độ dài + đa dạng ký tự. */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export const PASSWORD_STRENGTH_LABELS = ["Rất yếu", "Yếu", "Trung bình", "Khá mạnh", "Mạnh"] as const;

/** 299_000 → "04:59". Âm thì về "00:00". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Mô tả ngắn thiết bị từ User-Agent cho email cảnh báo — không cần chính xác tuyệt đối. */
export function describeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\/|Opera/.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Safari\//.test(userAgent) ? "Safari"
    : null;
  const os =
    /Windows/.test(userAgent) ? "Windows"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : null;
  if (!browser && !os) return null;
  return [browser ?? "Trình duyệt không rõ", os && `trên ${os}`].filter(Boolean).join(" ");
}

/** Giờ Việt Nam cố định — email đọc ở bất kỳ múi giờ server nào cũng hiển thị đúng. */
export function formatVietnamDateTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

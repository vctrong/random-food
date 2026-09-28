/**
 * Tham số luồng Quên mật khẩu / khoá – mở khoá tài khoản — tập trung một chỗ,
 * liệt kê lại trong docs/forgot-password.md. Đổi ở đây là đổi cho cả server lẫn UI.
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const PASSWORD_RESET_CONFIG = {
  /** Số chữ số của OTP. */
  otpLength: 6,
  /** OTP hết hạn sau 5 phút kể từ lúc gửi. */
  otpTtlMs: 5 * MINUTE,
  /** Nhập sai OTP đủ số lần này → tạm khoá tài khoản. Đếm lại từ 0 mỗi khi gửi OTP mới. */
  maxOtpAttempts: 5,
  /** Khoảng chờ tối thiểu giữa 2 lần gửi OTP cho cùng 1 email. */
  resendCooldownMs: 60 * 1000,
  /** Tối đa số lần gửi OTP (tính cả lần đầu) cho 1 email trong cửa sổ trượt 1 giờ. */
  maxOtpSendsPerHour: 5,
  otpSendWindowMs: HOUR,
  /** Reset token (cấp sau khi xác thực OTP đúng) — dùng 1 lần. */
  resetTokenTtlMs: 15 * MINUTE,
  /** Link mở khoá trong email cảnh báo — dùng 1 lần. */
  unlockTokenTtlMs: 24 * HOUR,
  /** Gửi lại email mở khoá: khoảng chờ + tối đa mỗi giờ cho 1 tài khoản. */
  unlockEmailCooldownMs: 60 * 1000,
  maxUnlockEmailsPerHour: 3,
  /** Bản ghi passwordResets tự xoá (TTL) sau khoảng này kể từ lần cập nhật cuối. */
  resetRecordRetentionMs: 24 * HOUR,
  /**
   * Chống dò email bằng thời gian phản hồi: mọi phản hồi của bước gửi OTP được
   * kéo dài tới ít nhất mốc này (đủ che thời gian gửi SMTP thông thường).
   */
  minRequestResponseMs: 1500,
  /** Màn hình thành công tự chuyển về trang đăng nhập sau khoảng này. */
  successRedirectMs: 6000,
} as const;

/** Rate limit theo IP (cửa sổ cố định) cho từng nhóm endpoint. */
export const PASSWORD_RESET_IP_LIMITS = {
  requestOtp: { limit: 20, windowMs: HOUR },
  verifyOtp: { limit: 30, windowMs: 15 * MINUTE },
  resetPassword: { limit: 20, windowMs: 15 * MINUTE },
  unlock: { limit: 20, windowMs: HOUR },
  resendUnlock: { limit: 10, windowMs: HOUR },
} as const;

/** Cookie httpOnly giữ reset token giữa lúc reload/đóng tab ở bước 3. */
export const RESET_TOKEN_COOKIE = "nayangi_pwreset";
export const RESET_TOKEN_COOKIE_PATH = "/api/auth";

/** sessionStorage — chỉ giữ dữ liệu KHÔNG nhạy cảm (email, mốc thời gian, bước). */
export const PASSWORD_RESET_STORAGE_KEY = "nayangi-password-reset";

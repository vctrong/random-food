/**
 * Tham số xác thực email trong trang Hồ sơ (docs/email-verification.md). Độ dài
 * OTP dùng chung PASSWORD_RESET_CONFIG.otpLength (6 số) để tái dùng OtpInput/isOtpFormat.
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const EMAIL_VERIFICATION_CONFIG = {
  /** Mã xác thực email có hạn 10 phút (người dùng đang đăng nhập, không gấp như đặt lại mật khẩu). */
  otpTtlMs: 10 * MINUTE,
  /** Sai đủ số lần này → huỷ mã, phải gửi mã mới (KHÔNG khoá tài khoản). */
  maxOtpAttempts: 5,
  resendCooldownMs: 60 * 1000,
  maxSendsPerHour: 5,
  sendWindowMs: HOUR,
  /** Bản ghi emailVerifications tự xoá (TTL) sau khoảng này kể từ lần cập nhật cuối. */
  recordRetentionMs: 24 * HOUR,
} as const;

/** Rate limit theo TÀI KHOẢN (đã đăng nhập) — không theo IP để người dùng chung mạng không chặn lẫn nhau. */
export const EMAIL_VERIFICATION_USER_LIMITS = {
  send: { limit: 10, windowMs: HOUR },
  confirm: { limit: 30, windowMs: 15 * MINUTE },
} as const;

/**
 * Thêm mật khẩu cho tài khoản chỉ có Google từ form Đăng ký (docs/email-verification.md
 * mục 7). Dùng chung OTP/cooldown/giới hạn giờ với EMAIL_VERIFICATION_CONFIG.
 */
export const PASSWORD_LINK_CONFIG = {
  /** Bản ghi link_password (kèm hash mật khẩu chờ gán) tự xoá sau khoảng này kể từ lần gửi mã cuối. */
  recordRetentionMs: HOUR,
} as const;

/**
 * Rate limit theo IP cho các API khách (chưa đăng nhập) của luồng đăng ký — đặt
 * chặt để hạn chế dò email qua check-email. Dùng bình thường: check-email ~2-4
 * lần/lượt đăng ký (có cache theo email ở client); start + resend chung 1 nhóm
 * (mỗi tài khoản vốn chỉ được 5 mã/giờ); confirm: 5 lần sai/mã.
 */
export const ACCOUNT_LINK_IP_LIMITS = {
  checkEmail: { limit: 20, windowMs: 10 * MINUTE },
  start: { limit: 10, windowMs: HOUR },
  confirm: { limit: 20, windowMs: 15 * MINUTE },
} as const;

/** Cookie httpOnly giữ token của phiên thêm mật khẩu (chỉ lưu hash trong DB). */
export const PASSWORD_LINK_COOKIE = "nayangi_pwlink";
export const PASSWORD_LINK_COOKIE_PATH = "/api/auth/link-password";

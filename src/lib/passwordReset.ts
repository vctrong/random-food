import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import {
  OTP_SEND_POLICY,
  UNLOCK_EMAIL_SEND_POLICY,
  attemptsLeft,
  evaluateSendAllowance,
  isOpaqueTokenFormat,
  isOtpFormat,
  isValidEmail,
  maskEmail,
  nextSendAvailableAt,
  normalizeEmail,
  recentSends,
  sendsRemaining,
} from "@/features/password-reset/passwordResetLogic";
import { isPasswordValid } from "@/lib/password";
import type { EmailMessage } from "@/lib/email/mailer";
import {
  buildAccountLockedEmail,
  buildAccountUnlockedEmail,
  buildPasswordChangedEmail,
  buildPasswordResetOtpEmail,
} from "@/lib/email/templates";

/**
 * Nghiệp vụ Quên mật khẩu + khoá/mở khoá tài khoản (docs/forgot-password.md).
 * Không import Mongoose/nodemailer trực tiếp — mọi I/O đi qua `PasswordResetDeps`
 * để test được cả luồng bằng repo giả (passwordReset.test.ts). Bản nối DB thật
 * nằm ở lib/passwordResetStore.ts. Route handler chỉ dịch kết quả sang HTTP.
 */

export interface ResetUserLock {
  lockedAt: Date;
  unlockTokenHash: string | null;
  unlockTokenExpiresAt: Date | null;
  unlockEmailHistory: Date[];
  lockIp: string | null;
  lockUserAgent: string | null;
}

export interface ResetUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  /** Đã xác thực email (users.isVerified) — BR-S15: chưa xác thực thì không dùng được Quên mật khẩu. */
  isVerified: boolean;
  isBanned: boolean;
  lock: ResetUserLock | null;
}

export interface ResetRecord {
  email: string;
  userId: string | null;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  attempts: number;
  sendHistory: Date[];
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
  lockedAt: Date | null;
}

export interface PasswordResetRepository {
  findUserByEmail(email: string): Promise<ResetUser | null>;
  findUserById(id: string): Promise<ResetUser | null>;
  findUserByUnlockTokenHash(tokenHash: string): Promise<ResetUser | null>;
  findReset(email: string): Promise<ResetRecord | null>;
  findResetByTokenHash(tokenHash: string): Promise<ResetRecord | null>;
  /** Upsert OTP mới: attempts về 0, xoá reset token cũ. */
  saveOtp(
    email: string,
    input: { userId: string | null; otpHash: string; otpExpiresAt: Date; sendHistory: Date[]; expireAt: Date },
  ): Promise<void>;
  /**
   * Tăng attempts NGUYÊN TỬ, chỉ khi OTP hiện tại vẫn là `otpHash` và attempts < max.
   * Trả attempts mới, hoặc null nếu OTP đã bị thay/dùng — chặn đoán song song vượt quá max.
   */
  registerFailedAttempt(email: string, otpHash: string, maxAttempts: number): Promise<number | null>;
  /** Đổi OTP lấy reset token NGUYÊN TỬ (điều kiện: OTP chưa bị thay và chưa bị khoá). */
  exchangeOtpForResetToken(
    email: string,
    input: { otpHash: string; maxAttempts: number; tokenHash: string; tokenExpiresAt: Date; expireAt: Date },
  ): Promise<boolean>;
  markResetLocked(email: string, input: { userId: string | null; lockedAt: Date; expireAt: Date }): Promise<void>;
  /** Xoá bản ghi NGUYÊN TỬ nếu token khớp và còn hạn — dùng đúng 1 lần. */
  consumeResetToken(tokenHash: string, now: Date): Promise<ResetRecord | null>;
  deleteReset(email: string): Promise<void>;
  lockUser(userId: string, lock: ResetUserLock): Promise<void>;
  updateUnlockToken(
    userId: string,
    input: { tokenHash: string; expiresAt: Date; unlockEmailHistory: Date[] },
  ): Promise<void>;
  /** Gỡ khoá NGUYÊN TỬ nếu token vẫn khớp — link dùng đúng 1 lần. */
  unlockUser(userId: string, tokenHash: string): Promise<boolean>;
  /** Đặt mật khẩu mới + tăng sessionVersion (đăng xuất mọi thiết bị). */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

export type SecurityEvent =
  | "password_reset_requested"
  | "password_reset_email_failed"
  | "password_reset_otp_failed"
  | "password_reset_otp_verified"
  | "account_locked"
  | "account_unlock_email_resent"
  | "account_unlocked"
  | "password_reset_completed";

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface PasswordResetDeps {
  repo: PasswordResetRepository;
  sendEmail(message: EmailMessage): Promise<void>;
  /** Ghi log sự kiện bảo mật — KHÔNG bao giờ nhận OTP/token thô. */
  logEvent(event: SecurityEvent, input: RequestContext & { userId?: string | null; metadata?: Record<string, unknown> }): Promise<void>;
  onPasswordChanged?(userId: string): Promise<void>;
  /** Pepper cho HMAC — OTP chỉ có 10^6 giá trị nên hash thường dò ngược offline được. */
  secret: string;
  /** Origin của app, dùng dựng link mở khoá trong email. */
  appUrl: string;
  now?: () => number;
  bcryptRounds?: number;
}

export interface OtpClientState {
  maskedEmail: string;
  otpExpiresAt: number;
  resendAvailableAt: number;
  sendsRemaining: number;
  attemptsLeft: number;
}

export type RequestOtpResult =
  | { kind: "sent"; state: OtpClientState }
  /** Bước 1 gửi lại cho email vừa được gửi mã trong thời gian cooldown — không gửi mã mới, dùng tiếp mã cũ. */
  | { kind: "alreadySent"; state: OtpClientState }
  | { kind: "invalidEmail" }
  /** Không có tài khoản / chưa xác thực email / bị Admin khoá — cùng 1 thông báo (BR-S11). */
  | { kind: "accountNotFound" }
  /** Tài khoản chỉ đăng nhập Google, không có mật khẩu để đặt lại. */
  | { kind: "googleAccount" }
  | { kind: "locked" }
  | { kind: "cooldown"; retryAfterMs: number }
  | { kind: "limit"; retryAfterMs: number }
  | { kind: "emailFailed" };

export type VerifyOtpResult =
  | { kind: "verified"; resetToken: string; resetExpiresAt: number }
  | { kind: "invalidInput" }
  | { kind: "incorrect"; attemptsLeft: number }
  | { kind: "expired" }
  | { kind: "noActiveOtp" }
  | { kind: "locked"; justLocked: boolean };

export type ResetPasswordResult =
  | { kind: "success" }
  | { kind: "sessionExpired" }
  | { kind: "mismatch" }
  | { kind: "weakPassword" }
  | { kind: "samePassword" };

export type UnlockResult = { kind: "unlocked" } | { kind: "expired" } | { kind: "invalid" };

export type ResendUnlockResult =
  | { kind: "accepted" }
  | { kind: "invalid" }
  | { kind: "cooldown"; retryAfterMs: number }
  | { kind: "limit"; retryAfterMs: number }
  | { kind: "emailFailed" };

export function generateOtp(): string {
  return String(randomInt(0, 10 ** PASSWORD_RESET_CONFIG.otpLength)).padStart(PASSWORD_RESET_CONFIG.otpLength, "0");
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

/** HMAC có "scope" riêng để hash OTP của email A không bao giờ khớp email B hay token loại khác. */
export function hashSecret(secret: string, scope: string, value: string): string {
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

export function createPasswordResetService(deps: PasswordResetDeps) {
  const now = deps.now ?? Date.now;
  const { repo } = deps;
  const otpHashOf = (email: string, otp: string) => hashSecret(deps.secret, `otp:${email}`, otp);
  const resetTokenHashOf = (token: string) => hashSecret(deps.secret, "reset", token);
  const unlockTokenHashOf = (token: string) => hashSecret(deps.secret, "unlock", token);
  const recordExpireAt = (at: number) => new Date(at + PASSWORD_RESET_CONFIG.resetRecordRetentionMs);
  const unlockUrlOf = (token: string) => `${deps.appUrl}/mo-khoa-tai-khoan?token=${token}`;

  function buildState(email: string, sendHistory: Date[], otpExpiresAt: number, attempts: number, at: number): OtpClientState {
    return {
      maskedEmail: maskEmail(email),
      otpExpiresAt,
      resendAvailableAt: nextSendAvailableAt(sendHistory, at, OTP_SEND_POLICY),
      sendsRemaining: sendsRemaining(sendHistory, at, OTP_SEND_POLICY),
      attemptsLeft: attemptsLeft(attempts),
    };
  }

  function isLocked(user: ResetUser | null, record: ResetRecord | null): boolean {
    return Boolean(user?.lock || record?.lockedAt);
  }

  /** Chỉ tài khoản có mật khẩu, đã xác thực email và không bị Admin khoá mới đặt lại được mật khẩu. */
  function canResetPassword(user: ResetUser | null): user is ResetUser {
    return Boolean(user && user.passwordHash && user.isVerified && !user.isBanned && !user.lock);
  }

  async function sendLockEmail(user: ResetUser, token: string, lock: ResetUserLock, context: RequestContext) {
    await deps.sendEmail(
      buildAccountLockedEmail({
        to: user.email,
        name: user.name,
        lockedAt: lock.lockedAt,
        ip: lock.lockIp,
        userAgent: lock.lockUserAgent,
        unlockUrl: unlockUrlOf(token),
        maxAttempts: PASSWORD_RESET_CONFIG.maxOtpAttempts,
        unlockTtlHours: PASSWORD_RESET_CONFIG.unlockTokenTtlMs / 3_600_000,
      }),
    ).catch(async (error: unknown) => {
      await deps.logEvent("password_reset_email_failed", { ...context, userId: user.id, metadata: { template: "account_locked" } });
      throw error;
    });
  }

  async function requestOtp(rawEmail: string, mode: "initial" | "resend", context: RequestContext): Promise<RequestOtpResult> {
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return { kind: "invalidEmail" };
    const at = now();

    const [user, record] = await Promise.all([repo.findUserByEmail(email), repo.findReset(email)]);
    if (isLocked(user, record)) return { kind: "locked" };
    // Bị Admin khoá coi như không tồn tại; chưa xác thực email cũng không được đặt lại (BR-S11, BR-S15).
    if (!user || user.isBanned || !user.isVerified) return { kind: "accountNotFound" };
    if (!user.passwordHash) return { kind: "googleAccount" };

    const history = record?.sendHistory ?? [];
    const allowance = evaluateSendAllowance(history, at, OTP_SEND_POLICY);
    if (!allowance.allowed) {
      const hasLiveOtp = Boolean(record?.otpHash && record.otpExpiresAt && record.otpExpiresAt.getTime() > at);
      // Quay lại bước 1 rồi bấm gửi cho đúng email vừa gửi: dùng tiếp mã cũ thay vì báo lỗi.
      if (mode === "initial" && allowance.reason === "cooldown" && hasLiveOtp && record?.otpExpiresAt) {
        return { kind: "alreadySent", state: buildState(email, history, record.otpExpiresAt.getTime(), record.attempts, at) };
      }
      return allowance.reason === "cooldown"
        ? { kind: "cooldown", retryAfterMs: allowance.retryAfterMs }
        : { kind: "limit", retryAfterMs: allowance.retryAfterMs };
    }

    const otp = generateOtp();
    const otpExpiresAt = at + PASSWORD_RESET_CONFIG.otpTtlMs;
    try {
      await deps.sendEmail(
        buildPasswordResetOtpEmail({
          to: user.email,
          name: user.name,
          otp,
          expiresAt: new Date(otpExpiresAt),
          ttlMinutes: PASSWORD_RESET_CONFIG.otpTtlMs / 60_000,
        }),
      );
    } catch {
      await deps.logEvent("password_reset_email_failed", { ...context, userId: user.id, metadata: { template: "otp" } });
      return { kind: "emailFailed" };
    }

    const sendHistory = [...recentSends(history, at, OTP_SEND_POLICY), new Date(at)];
    await repo.saveOtp(email, {
      userId: user.id,
      otpHash: otpHashOf(email, otp),
      otpExpiresAt: new Date(otpExpiresAt),
      sendHistory,
      expireAt: recordExpireAt(at),
    });
    await deps.logEvent("password_reset_requested", { ...context, userId: user.id, metadata: { mode } });

    return { kind: "sent", state: buildState(email, sendHistory, otpExpiresAt, 0, at) };
  }

  async function verifyOtp(rawEmail: string, otp: string, context: RequestContext): Promise<VerifyOtpResult> {
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email) || !isOtpFormat(otp)) return { kind: "invalidInput" };
    const at = now();

    const record = await repo.findReset(email);
    const user = record?.userId ? await repo.findUserById(record.userId) : null;
    if (isLocked(user, record)) return { kind: "locked", justLocked: false };
    if (!record?.otpHash || !record.otpExpiresAt) return { kind: "noActiveOtp" };
    if (record.otpExpiresAt.getTime() <= at) return { kind: "expired" };

    const isMatch = safeEqualHex(otpHashOf(email, otp), record.otpHash);

    if (isMatch && canResetPassword(user)) {
      const resetToken = generateOpaqueToken();
      const resetExpiresAt = at + PASSWORD_RESET_CONFIG.resetTokenTtlMs;
      const exchanged = await repo.exchangeOtpForResetToken(email, {
        otpHash: record.otpHash,
        maxAttempts: PASSWORD_RESET_CONFIG.maxOtpAttempts,
        tokenHash: resetTokenHashOf(resetToken),
        tokenExpiresAt: new Date(resetExpiresAt),
        expireAt: recordExpireAt(at),
      });
      if (!exchanged) return { kind: "noActiveOtp" };
      await deps.logEvent("password_reset_otp_verified", { ...context, userId: user.id });
      return { kind: "verified", resetToken, resetExpiresAt };
    }

    const attempts = await repo.registerFailedAttempt(email, record.otpHash, PASSWORD_RESET_CONFIG.maxOtpAttempts);
    if (attempts === null) return { kind: "noActiveOtp" };
    await deps.logEvent("password_reset_otp_failed", {
      ...context,
      userId: user?.id ?? null,
      metadata: { attempts, maskedEmail: maskEmail(email) },
    });

    if (attempts < PASSWORD_RESET_CONFIG.maxOtpAttempts) return { kind: "incorrect", attemptsLeft: attemptsLeft(attempts) };

    const lockedAt = new Date(at);
    await repo.markResetLocked(email, { userId: user?.id ?? null, lockedAt, expireAt: recordExpireAt(at) });
    if (user && !user.lock) {
      const unlockToken = generateOpaqueToken();
      const lock: ResetUserLock = {
        lockedAt,
        unlockTokenHash: unlockTokenHashOf(unlockToken),
        unlockTokenExpiresAt: new Date(at + PASSWORD_RESET_CONFIG.unlockTokenTtlMs),
        unlockEmailHistory: [lockedAt],
        lockIp: context.ip,
        lockUserAgent: context.userAgent,
      };
      await repo.lockUser(user.id, lock);
      await deps.logEvent("account_locked", { ...context, userId: user.id, metadata: { reason: "otp_failed" } });
      // Gửi cảnh báo thất bại không huỷ việc khoá — người dùng vẫn gửi lại được email mở khoá.
      await sendLockEmail(user, unlockToken, lock, context).catch(() => undefined);
    }
    return { kind: "locked", justLocked: true };
  }

  async function getResetSession(token: string | null | undefined): Promise<{ maskedEmail: string; expiresAt: number } | null> {
    if (!token || !isOpaqueTokenFormat(token)) return null;
    const record = await repo.findResetByTokenHash(resetTokenHashOf(token));
    if (!record?.resetTokenExpiresAt || record.resetTokenExpiresAt.getTime() <= now()) return null;
    return { maskedEmail: maskEmail(record.email), expiresAt: record.resetTokenExpiresAt.getTime() };
  }

  async function resetPassword(
    input: { token: string | null | undefined; password: string; confirmPassword: string },
    context: RequestContext,
  ): Promise<ResetPasswordResult> {
    const { token, password, confirmPassword } = input;
    if (!token || !isOpaqueTokenFormat(token)) return { kind: "sessionExpired" };
    const at = now();
    const tokenHash = resetTokenHashOf(token);

    const record = await repo.findResetByTokenHash(tokenHash);
    if (!record?.userId || !record.resetTokenExpiresAt || record.resetTokenExpiresAt.getTime() <= at) {
      return { kind: "sessionExpired" };
    }
    if (password !== confirmPassword) return { kind: "mismatch" };
    if (!isPasswordValid(password)) return { kind: "weakPassword" };

    const user = await repo.findUserById(record.userId);
    if (!canResetPassword(user) || !user.passwordHash) {
      await repo.deleteReset(record.email);
      return { kind: "sessionExpired" };
    }
    // Kiểm tra trùng TRƯỚC khi tiêu token — nhập trùng thì vẫn thử lại được trong hạn.
    if (await bcrypt.compare(password, user.passwordHash)) return { kind: "samePassword" };

    const consumed = await repo.consumeResetToken(tokenHash, new Date(at));
    if (!consumed) return { kind: "sessionExpired" };

    await repo.updatePassword(user.id, await bcrypt.hash(password, deps.bcryptRounds ?? 10));
    await repo.deleteReset(record.email);
    await deps.logEvent("password_reset_completed", { ...context, userId: user.id });
    await deps.onPasswordChanged?.(user.id).catch(() => undefined);
    await deps
      .sendEmail(buildPasswordChangedEmail({ to: user.email, name: user.name, changedAt: new Date(at), ip: context.ip, userAgent: context.userAgent, loginUrl: `${deps.appUrl}/dang-nhap` }))
      .catch(() => deps.logEvent("password_reset_email_failed", { ...context, userId: user.id, metadata: { template: "password_changed" } }));
    return { kind: "success" };
  }

  async function unlockAccount(token: string | null | undefined, context: RequestContext): Promise<UnlockResult> {
    if (!token || !isOpaqueTokenFormat(token)) return { kind: "invalid" };
    const tokenHash = unlockTokenHashOf(token);
    const user = await repo.findUserByUnlockTokenHash(tokenHash);
    if (!user?.lock) return { kind: "invalid" };
    if (!user.lock.unlockTokenExpiresAt || user.lock.unlockTokenExpiresAt.getTime() <= now()) return { kind: "expired" };

    if (!(await repo.unlockUser(user.id, tokenHash))) return { kind: "invalid" };
    await repo.deleteReset(user.email);
    await deps.logEvent("account_unlocked", { ...context, userId: user.id });
    await deps
      .sendEmail(buildAccountUnlockedEmail({ to: user.email, name: user.name, unlockedAt: new Date(now()), loginUrl: `${deps.appUrl}/dang-nhap` }))
      .catch(() => deps.logEvent("password_reset_email_failed", { ...context, userId: user.id, metadata: { template: "account_unlocked" } }));
    return { kind: "unlocked" };
  }

  /** Gửi lại email mở khoá — theo email (từ trang Quên mật khẩu) hoặc theo token cũ đã hết hạn (từ trang mở khoá). */
  async function resendUnlockEmail(input: { email?: string; token?: string }, context: RequestContext): Promise<ResendUnlockResult> {
    let user: ResetUser | null = null;
    if (input.token) {
      if (!isOpaqueTokenFormat(input.token)) return { kind: "invalid" };
      user = await repo.findUserByUnlockTokenHash(unlockTokenHashOf(input.token));
      if (!user) return { kind: "invalid" };
    } else if (input.email) {
      const email = normalizeEmail(input.email);
      if (!isValidEmail(email)) return { kind: "invalid" };
      user = await repo.findUserByEmail(email);
    }
    // Không bị khoá / không tồn tại: trả chung "accepted" — không xác nhận gì thêm.
    if (!user?.lock) return { kind: "accepted" };

    const at = now();
    const allowance = evaluateSendAllowance(user.lock.unlockEmailHistory, at, UNLOCK_EMAIL_SEND_POLICY);
    if (!allowance.allowed) {
      return allowance.reason === "cooldown"
        ? { kind: "cooldown", retryAfterMs: allowance.retryAfterMs }
        : { kind: "limit", retryAfterMs: allowance.retryAfterMs };
    }

    const unlockToken = generateOpaqueToken();
    const lock: ResetUserLock = {
      ...user.lock,
      unlockTokenHash: unlockTokenHashOf(unlockToken),
      unlockTokenExpiresAt: new Date(at + PASSWORD_RESET_CONFIG.unlockTokenTtlMs),
      unlockEmailHistory: [...recentSends(user.lock.unlockEmailHistory, at, UNLOCK_EMAIL_SEND_POLICY), new Date(at)],
    };
    try {
      await sendLockEmail(user, unlockToken, lock, context);
    } catch {
      return { kind: "emailFailed" };
    }
    await repo.updateUnlockToken(user.id, {
      tokenHash: lock.unlockTokenHash as string,
      expiresAt: lock.unlockTokenExpiresAt as Date,
      unlockEmailHistory: lock.unlockEmailHistory,
    });
    await deps.logEvent("account_unlock_email_resent", { ...context, userId: user.id });
    return { kind: "accepted" };
  }

  return { requestOtp, verifyOtp, getResetSession, resetPassword, unlockAccount, resendUnlockEmail };
}

export type PasswordResetService = ReturnType<typeof createPasswordResetService>;

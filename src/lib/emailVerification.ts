import bcrypt from "bcryptjs";
import { EMAIL_VERIFICATION_CONFIG, PASSWORD_LINK_CONFIG } from "@/constants/emailVerification";
import {
  attemptsLeft,
  evaluateSendAllowance,
  isOtpFormat,
  isValidEmail,
  maskEmail,
  nextSendAvailableAt,
  normalizeEmail,
  recentSends,
  sendsRemaining,
  type SendPolicy,
} from "@/features/password-reset/passwordResetLogic";
import type { EmailMessage } from "@/lib/email/mailer";
import { buildEmailVerificationOtpEmail, buildPasswordLinkOtpEmail } from "@/lib/email/templates";
import { isPasswordValid } from "@/lib/password";
import {
  generateOpaqueToken,
  generateOtp,
  hashSecret,
  safeEqualHex,
  type OtpClientState,
  type RequestContext,
} from "@/lib/passwordReset";

/**
 * Xác thực email bằng OTP — BR-S15, docs/email-verification.md. Một logic OTP
 * (hash HMAC, hạn 10 phút, 5 lần sai, cooldown 60s, 5 mã/giờ, dùng 1 lần) cho 3 luồng:
 * - Hồ sơ: xác thực email của tài khoản đang đăng nhập (purpose "verify").
 * - Đăng ký bằng email của tài khoản chỉ có Google: OTP đúng mới gán mật khẩu
 *   (purpose "link_password").
 * - Hồ sơ: tạo mật khẩu đầu tiên sau khi đã xác thực (setInitialPassword).
 * Cùng khuôn với lib/passwordReset.ts: không import Mongoose/nodemailer, mọi I/O
 * qua deps để test bằng repo giả. Bản nối DB thật ở lib/emailVerificationStore.ts.
 */

export type VerificationPurpose = "verify" | "link_password";

export interface VerificationUser {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  isBanned: boolean;
  hasPassword: boolean;
}

/** Tra theo email cho luồng đăng ký (khách chưa đăng nhập). */
export interface AccountLookup extends VerificationUser {
  /** Đang tạm khoá do sai OTP Quên mật khẩu (users.securityLock). */
  isLocked: boolean;
  /** Có bản ghi `accounts` provider "google" (NextAuth adapter). */
  hasGoogleAccount: boolean;
}

export interface VerificationRecord {
  userId: string;
  purpose: VerificationPurpose;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  attempts: number;
  sendHistory: Date[];
  pendingPasswordHash: string | null;
  flowTokenHash: string | null;
}

export interface SaveOtpInput {
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  sendHistory: Date[];
  expireAt: Date;
  purpose: VerificationPurpose;
  /** Chỉ với purpose "link_password" — purpose "verify" luôn xoá 2 field này. */
  pendingPasswordHash?: string;
  flowTokenHash?: string;
}

export interface EmailVerificationRepository {
  findUser(userId: string): Promise<VerificationUser | null>;
  findAccountByEmail(email: string): Promise<AccountLookup | null>;
  findRecord(userId: string): Promise<VerificationRecord | null>;
  /** Upsert mã mới: attempts về 0, mã cũ (kể cả khác purpose) mất hiệu lực. */
  saveOtp(userId: string, input: SaveOtpInput): Promise<void>;
  /** Đổi mật khẩu chờ gán của phiên link_password đang mở (cùng trình duyệt), không gửi mã mới. */
  updatePendingPassword(userId: string, flowTokenHash: string, pendingPasswordHash: string): Promise<boolean>;
  /** Tăng attempts NGUYÊN TỬ nếu mã hiện tại vẫn là `otpHash` và attempts < max; null nếu mã đã bị thay/huỷ. */
  registerFailedAttempt(userId: string, otpHash: string, maxAttempts: number): Promise<number | null>;
  /** Huỷ mã hiện tại (giữ sendHistory để cooldown/giới hạn giờ vẫn đúng). */
  invalidateOtp(userId: string): Promise<void>;
  /** Tiêu mã NGUYÊN TỬ (xoá bản ghi) nếu mã vẫn khớp và chưa quá số lần sai — dùng đúng 1 lần. */
  consumeOtp(userId: string, otpHash: string, maxAttempts: number): Promise<boolean>;
  markUserVerified(userId: string): Promise<void>;
  /** Gán mật khẩu + bật isVerified NGUYÊN TỬ chỉ khi tài khoản CHƯA có mật khẩu; false nếu đã có. */
  setPasswordIfMissing(userId: string, passwordHash: string): Promise<boolean>;
}

export type EmailVerificationEvent =
  | "email_verification_requested"
  | "email_verification_email_failed"
  | "email_verification_failed"
  | "email_verified"
  | "password_link_requested"
  | "password_linked"
  | "password_created";

export interface EmailVerificationDeps {
  repo: EmailVerificationRepository;
  sendEmail(message: EmailMessage): Promise<void>;
  /** Không bao giờ nhận OTP/token/mật khẩu thô. */
  logEvent(event: EmailVerificationEvent, input: RequestContext & { userId: string; metadata?: Record<string, unknown> }): Promise<void>;
  secret: string;
  now?: () => number;
  bcryptRounds?: number;
}

export const EMAIL_VERIFICATION_SEND_POLICY: SendPolicy = {
  cooldownMs: EMAIL_VERIFICATION_CONFIG.resendCooldownMs,
  maxPerWindow: EMAIL_VERIFICATION_CONFIG.maxSendsPerHour,
  windowMs: EMAIL_VERIFICATION_CONFIG.sendWindowMs,
};

export interface EmailVerificationStatus {
  isVerified: boolean;
  hasPassword: boolean;
  maskedEmail: string;
  /** Mã đang còn hạn (để reload trang Hồ sơ vẫn nhập tiếp được); null nếu chưa gửi / đã hết hạn / đã huỷ. */
  pending: OtpClientState | null;
  /** Mốc giờ server lúc tính trạng thái — client dùng để bù lệch đồng hồ. */
  serverTime: number;
}

type SendLimitResult = { kind: "cooldown"; retryAfterMs: number } | { kind: "limit"; retryAfterMs: number };

export type SendCodeResult =
  | { kind: "sent"; state: OtpClientState }
  | { kind: "alreadyVerified" }
  | { kind: "notFound" }
  | SendLimitResult
  | { kind: "emailFailed" };

/** Kết quả sai/hết hạn mã — chung cho mọi luồng. */
type CodeFailure =
  | { kind: "invalidInput" }
  | { kind: "incorrect"; attemptsLeft: number }
  /** Sai đủ số lần — mã đã bị huỷ, phải gửi mã mới. */
  | { kind: "tooManyAttempts" }
  | { kind: "expired" }
  | { kind: "noActiveCode" };

export type ConfirmCodeResult = { kind: "verified" } | { kind: "alreadyVerified" } | { kind: "notFound" } | CodeFailure;

export type EmailCheckResult = { kind: "invalidEmail" } | { kind: "available" } | { kind: "taken" } | { kind: "googleOnly" };

export type StartPasswordLinkResult =
  | { kind: "sent"; state: OtpClientState; flowToken: string }
  | { kind: "invalidEmail" }
  | { kind: "weakPassword" }
  /** Email chưa có tài khoản — client quay về luồng đăng ký thường. */
  | { kind: "available" }
  /** Email đã có tài khoản có mật khẩu. */
  | { kind: "taken" }
  /** Tài khoản bị Admin khoá hoặc đang tạm khoá. */
  | { kind: "unavailable" }
  | SendLimitResult
  | { kind: "emailFailed" };

export type ResendPasswordLinkResult =
  | { kind: "sent"; state: OtpClientState }
  /** Không có phiên hợp lệ cho trình duyệt này (cookie sai/hết hạn, bản ghi đã bị thay). */
  | { kind: "sessionInvalid" }
  | { kind: "alreadyHasPassword" }
  | SendLimitResult
  | { kind: "emailFailed" };

export type ConfirmPasswordLinkResult =
  | { kind: "linked"; userId: string }
  | { kind: "sessionInvalid" }
  | { kind: "alreadyHasPassword" }
  | { kind: "unavailable" }
  | CodeFailure;

export type SetInitialPasswordResult =
  | { kind: "created" }
  | { kind: "notFound" }
  | { kind: "notVerified" }
  | { kind: "alreadyHasPassword" }
  | { kind: "mismatch" }
  | { kind: "weakPassword" };

const isGoogleOnly = (account: AccountLookup) => !account.hasPassword && account.hasGoogleAccount;

export function createEmailVerificationService(deps: EmailVerificationDeps) {
  const now = deps.now ?? Date.now;
  const { repo } = deps;
  const maxAttempts = EMAIL_VERIFICATION_CONFIG.maxOtpAttempts;
  const bcryptRounds = deps.bcryptRounds ?? 10;
  // Scope khác nhau theo purpose: mã của luồng này không bao giờ khớp ở luồng kia.
  const otpHashOf = (purpose: VerificationPurpose, userId: string, otp: string) =>
    hashSecret(deps.secret, purpose === "verify" ? `verify-email:${userId}` : `link-password:${userId}`, otp);
  const flowTokenHashOf = (userId: string, token: string) => hashSecret(deps.secret, `link-flow:${userId}`, token);
  const retentionOf = (purpose: VerificationPurpose) =>
    purpose === "verify" ? EMAIL_VERIFICATION_CONFIG.recordRetentionMs : PASSWORD_LINK_CONFIG.recordRetentionMs;

  function buildState(email: string, record: Pick<VerificationRecord, "sendHistory" | "attempts">, otpExpiresAt: number, at: number): OtpClientState {
    return {
      maskedEmail: maskEmail(email),
      otpExpiresAt,
      resendAvailableAt: nextSendAvailableAt(record.sendHistory, at, EMAIL_VERIFICATION_SEND_POLICY),
      sendsRemaining: sendsRemaining(record.sendHistory, at, EMAIL_VERIFICATION_SEND_POLICY),
      attemptsLeft: attemptsLeft(record.attempts, maxAttempts),
    };
  }

  function hasLiveCode(record: VerificationRecord | null, at: number): record is VerificationRecord & { otpHash: string; otpExpiresAt: Date } {
    return Boolean(record?.otpHash && record.otpExpiresAt && record.otpExpiresAt.getTime() > at);
  }

  function matchesFlow(userId: string, record: VerificationRecord | null, flowToken: string | null): record is VerificationRecord & { flowTokenHash: string; pendingPasswordHash: string } {
    return Boolean(
      flowToken &&
        record?.purpose === "link_password" &&
        record.flowTokenHash &&
        record.pendingPasswordHash &&
        safeEqualHex(flowTokenHashOf(userId, flowToken), record.flowTokenHash),
    );
  }

  /**
   * Kiểm tra cooldown/giới hạn giờ → gửi email → lưu hash mã mới. Email lỗi thì
   * không lưu gì (không tính lượt). sendHistory dùng chung mọi purpose.
   */
  async function issueCode(
    user: Pick<VerificationUser, "id" | "email" | "name">,
    record: VerificationRecord | null,
    purpose: VerificationPurpose,
    extra: Pick<SaveOtpInput, "pendingPasswordHash" | "flowTokenHash">,
    context: RequestContext,
  ): Promise<{ kind: "sent"; state: OtpClientState } | SendLimitResult | { kind: "emailFailed" }> {
    const at = now();
    const history = record?.sendHistory ?? [];
    const allowance = evaluateSendAllowance(history, at, EMAIL_VERIFICATION_SEND_POLICY);
    if (!allowance.allowed) {
      return allowance.reason === "cooldown"
        ? { kind: "cooldown", retryAfterMs: allowance.retryAfterMs }
        : { kind: "limit", retryAfterMs: allowance.retryAfterMs };
    }

    const otp = generateOtp();
    const otpExpiresAt = at + EMAIL_VERIFICATION_CONFIG.otpTtlMs;
    const emailInput = {
      to: user.email,
      name: user.name,
      otp,
      expiresAt: new Date(otpExpiresAt),
      ttlMinutes: EMAIL_VERIFICATION_CONFIG.otpTtlMs / 60_000,
    };
    try {
      await deps.sendEmail(purpose === "verify" ? buildEmailVerificationOtpEmail(emailInput) : buildPasswordLinkOtpEmail(emailInput));
    } catch {
      await deps.logEvent("email_verification_email_failed", { ...context, userId: user.id, metadata: { purpose } });
      return { kind: "emailFailed" };
    }

    const sendHistory = [...recentSends(history, at, EMAIL_VERIFICATION_SEND_POLICY), new Date(at)];
    await repo.saveOtp(user.id, {
      email: user.email,
      otpHash: otpHashOf(purpose, user.id, otp),
      otpExpiresAt: new Date(otpExpiresAt),
      sendHistory,
      expireAt: new Date(at + retentionOf(purpose)),
      purpose,
      ...extra,
    });
    await deps.logEvent(purpose === "verify" ? "email_verification_requested" : "password_link_requested", { ...context, userId: user.id });
    return { kind: "sent", state: buildState(user.email, { sendHistory, attempts: 0 }, otpExpiresAt, at) };
  }

  /**
   * So mã với bản ghi đang mở. Đúng → tiêu mã (nguyên tử, 1 lần) rồi trả "matched";
   * sai → tăng bộ đếm, đủ ngưỡng thì huỷ mã.
   */
  async function checkCode(
    userId: string,
    purpose: VerificationPurpose,
    record: VerificationRecord | null,
    otp: string,
    context: RequestContext,
  ): Promise<{ kind: "matched" } | CodeFailure> {
    if (!record?.otpHash || !record.otpExpiresAt || record.purpose !== purpose) return { kind: "noActiveCode" };
    if (record.otpExpiresAt.getTime() <= now()) return { kind: "expired" };

    if (safeEqualHex(otpHashOf(purpose, userId, otp), record.otpHash)) {
      return (await repo.consumeOtp(userId, record.otpHash, maxAttempts)) ? { kind: "matched" } : { kind: "noActiveCode" };
    }

    const attempts = await repo.registerFailedAttempt(userId, record.otpHash, maxAttempts);
    if (attempts === null) return { kind: "noActiveCode" };
    await deps.logEvent("email_verification_failed", { ...context, userId, metadata: { attempts, purpose } });
    if (attempts < maxAttempts) return { kind: "incorrect", attemptsLeft: attemptsLeft(attempts, maxAttempts) };
    await repo.invalidateOtp(userId);
    return { kind: "tooManyAttempts" };
  }

  // ---- Hồ sơ: xác thực email của tài khoản đang đăng nhập ----

  async function getStatus(userId: string): Promise<EmailVerificationStatus | null> {
    const user = await repo.findUser(userId);
    if (!user) return null;
    const at = now();
    const base = { hasPassword: user.hasPassword, maskedEmail: maskEmail(user.email), serverTime: at };
    if (user.isVerified) return { ...base, isVerified: true, pending: null };
    const record = await repo.findRecord(userId);
    return {
      ...base,
      isVerified: false,
      pending:
        hasLiveCode(record, at) && record.purpose === "verify"
          ? buildState(user.email, record, record.otpExpiresAt.getTime(), at)
          : null,
    };
  }

  async function sendCode(userId: string, context: RequestContext): Promise<SendCodeResult> {
    const user = await repo.findUser(userId);
    if (!user || user.isBanned) return { kind: "notFound" };
    if (user.isVerified) return { kind: "alreadyVerified" };
    return issueCode(user, await repo.findRecord(userId), "verify", {}, context);
  }

  async function confirmCode(userId: string, otp: string, context: RequestContext): Promise<ConfirmCodeResult> {
    if (!isOtpFormat(otp)) return { kind: "invalidInput" };
    const user = await repo.findUser(userId);
    if (!user || user.isBanned) return { kind: "notFound" };
    if (user.isVerified) return { kind: "alreadyVerified" };

    const checked = await checkCode(userId, "verify", await repo.findRecord(userId), otp, context);
    if (checked.kind !== "matched") return checked;
    await repo.markUserVerified(userId);
    await deps.logEvent("email_verified", { ...context, userId });
    return { kind: "verified" };
  }

  /** Hồ sơ: tạo mật khẩu đầu tiên cho tài khoản đã xác thực email mà chưa có mật khẩu (tài khoản Google). */
  async function setInitialPassword(
    userId: string,
    password: string,
    confirmPassword: string,
    context: RequestContext,
  ): Promise<SetInitialPasswordResult> {
    const user = await repo.findUser(userId);
    if (!user || user.isBanned) return { kind: "notFound" };
    if (user.hasPassword) return { kind: "alreadyHasPassword" };
    if (!user.isVerified) return { kind: "notVerified" };
    if (password !== confirmPassword) return { kind: "mismatch" };
    if (!isPasswordValid(password)) return { kind: "weakPassword" };

    const created = await repo.setPasswordIfMissing(userId, await bcrypt.hash(password, bcryptRounds));
    if (!created) return { kind: "alreadyHasPassword" };
    await deps.logEvent("password_created", { ...context, userId });
    return { kind: "created" };
  }

  // ---- Đăng ký bằng email của tài khoản chỉ có Google (khách chưa đăng nhập) ----

  async function checkEmail(rawEmail: string): Promise<EmailCheckResult> {
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return { kind: "invalidEmail" };
    const account = await repo.findAccountByEmail(email);
    if (!account) return { kind: "available" };
    return isGoogleOnly(account) ? { kind: "googleOnly" } : { kind: "taken" };
  }

  async function startPasswordLink(
    input: { email: string; password: string; flowToken: string | null },
    context: RequestContext,
  ): Promise<StartPasswordLinkResult> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) return { kind: "invalidEmail" };
    if (!isPasswordValid(input.password)) return { kind: "weakPassword" };

    const account = await repo.findAccountByEmail(email);
    if (!account) return { kind: "available" };
    if (!isGoogleOnly(account)) return { kind: "taken" };
    if (account.isBanned || account.isLocked) return { kind: "unavailable" };

    const record = await repo.findRecord(account.id);
    const at = now();
    const pendingPasswordHash = await bcrypt.hash(input.password, bcryptRounds);

    // Cùng trình duyệt quay lại sửa mật khẩu khi mã cũ còn hạn: chỉ thay mật khẩu chờ gán, dùng tiếp mã đã gửi.
    if (input.flowToken && matchesFlow(account.id, record, input.flowToken) && hasLiveCode(record, at)) {
      if (await repo.updatePendingPassword(account.id, record.flowTokenHash, pendingPasswordHash)) {
        return {
          kind: "sent",
          flowToken: input.flowToken,
          state: buildState(account.email, record, record.otpExpiresAt.getTime(), at),
        };
      }
    }

    const flowToken = generateOpaqueToken();
    const result = await issueCode(
      account,
      record,
      "link_password",
      { pendingPasswordHash, flowTokenHash: flowTokenHashOf(account.id, flowToken) },
      context,
    );
    return result.kind === "sent" ? { ...result, flowToken } : result;
  }

  async function resendPasswordLinkCode(
    input: { email: string; flowToken: string | null },
    context: RequestContext,
  ): Promise<ResendPasswordLinkResult> {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) return { kind: "sessionInvalid" };
    const account = await repo.findAccountByEmail(email);
    if (!account || account.isBanned || account.isLocked) return { kind: "sessionInvalid" };
    if (account.hasPassword) return { kind: "alreadyHasPassword" };

    const record = await repo.findRecord(account.id);
    if (!matchesFlow(account.id, record, input.flowToken)) return { kind: "sessionInvalid" };
    return issueCode(
      account,
      record,
      "link_password",
      { pendingPasswordHash: record.pendingPasswordHash, flowTokenHash: record.flowTokenHash },
      context,
    );
  }

  async function confirmPasswordLink(
    input: { email: string; otp: string; flowToken: string | null },
    context: RequestContext,
  ): Promise<ConfirmPasswordLinkResult> {
    if (!isOtpFormat(input.otp)) return { kind: "invalidInput" };
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) return { kind: "sessionInvalid" };
    const account = await repo.findAccountByEmail(email);
    if (!account) return { kind: "sessionInvalid" };
    if (account.hasPassword) return { kind: "alreadyHasPassword" };
    if (account.isBanned || account.isLocked) return { kind: "unavailable" };

    const record = await repo.findRecord(account.id);
    if (!matchesFlow(account.id, record, input.flowToken)) return { kind: "sessionInvalid" };
    const { pendingPasswordHash } = record;

    const checked = await checkCode(account.id, "link_password", record, input.otp, context);
    if (checked.kind !== "matched") return checked;
    // Chỉ tới đây (OTP đúng, đã tiêu) mật khẩu mới được gán vào tài khoản CŨ.
    if (!(await repo.setPasswordIfMissing(account.id, pendingPasswordHash))) return { kind: "alreadyHasPassword" };
    await deps.logEvent("password_linked", { ...context, userId: account.id });
    return { kind: "linked", userId: account.id };
  }

  return {
    getStatus,
    sendCode,
    confirmCode,
    setInitialPassword,
    checkEmail,
    startPasswordLink,
    resendPasswordLinkCode,
    confirmPasswordLink,
  };
}

export type EmailVerificationService = ReturnType<typeof createEmailVerificationService>;

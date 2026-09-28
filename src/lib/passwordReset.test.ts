import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { PASSWORD_RESET_CONFIG } from "@/constants/passwordReset";
import type { EmailMessage } from "@/lib/email/mailer";
import {
  createPasswordResetService,
  type PasswordResetRepository,
  type ResetRecord,
  type ResetUser,
  type SecurityEvent,
} from "./passwordReset";

/** Repo giả trong bộ nhớ — giữ đúng các điều kiện nguyên tử của bản Mongo (passwordResetStore.ts). */
function createFakeRepo() {
  const users = new Map<string, ResetUser & { sessionVersion: number }>();
  const resets = new Map<string, ResetRecord>();

  const repo: PasswordResetRepository = {
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async findUserByUnlockTokenHash(hash) {
      return [...users.values()].find((user) => user.lock?.unlockTokenHash === hash) ?? null;
    },
    async findReset(email) {
      return resets.get(email) ?? null;
    },
    async findResetByTokenHash(hash) {
      return [...resets.values()].find((record) => record.resetTokenHash === hash) ?? null;
    },
    async saveOtp(email, input) {
      resets.set(email, {
        email,
        userId: input.userId,
        otpHash: input.otpHash,
        otpExpiresAt: input.otpExpiresAt,
        attempts: 0,
        sendHistory: input.sendHistory,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        lockedAt: null,
      });
    },
    async registerFailedAttempt(email, otpHash, max) {
      const record = resets.get(email);
      if (!record || record.otpHash !== otpHash || record.attempts >= max) return null;
      record.attempts += 1;
      return record.attempts;
    },
    async exchangeOtpForResetToken(email, input) {
      const record = resets.get(email);
      if (!record || record.otpHash !== input.otpHash || record.attempts >= input.maxAttempts || record.lockedAt) return false;
      Object.assign(record, { otpHash: null, otpExpiresAt: null, resetTokenHash: input.tokenHash, resetTokenExpiresAt: input.tokenExpiresAt });
      return true;
    },
    async markResetLocked(email, input) {
      const record = resets.get(email);
      resets.set(email, {
        ...(record ?? { email, attempts: 0, sendHistory: [] }),
        userId: input.userId,
        lockedAt: input.lockedAt,
        otpHash: null,
        otpExpiresAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      } as ResetRecord);
    },
    async consumeResetToken(hash, now) {
      const record = [...resets.values()].find((item) => item.resetTokenHash === hash);
      if (!record?.resetTokenExpiresAt || record.resetTokenExpiresAt <= now) return null;
      resets.delete(record.email);
      return record;
    },
    async deleteReset(email) {
      resets.delete(email);
    },
    async lockUser(userId, lock) {
      const user = users.get(userId);
      if (user) user.lock = lock;
    },
    async updateUnlockToken(userId, input) {
      const user = users.get(userId);
      if (user?.lock) {
        Object.assign(user.lock, {
          unlockTokenHash: input.tokenHash,
          unlockTokenExpiresAt: input.expiresAt,
          unlockEmailHistory: input.unlockEmailHistory,
        });
      }
    },
    async unlockUser(userId, hash) {
      const user = users.get(userId);
      if (!user?.lock || user.lock.unlockTokenHash !== hash) return false;
      user.lock = null;
      return true;
    },
    async updatePassword(userId, passwordHash) {
      const user = users.get(userId);
      if (user) {
        user.passwordHash = passwordHash;
        user.sessionVersion += 1;
      }
    },
  };
  return { repo, users, resets };
}

const OLD_PASSWORD = "OldPass@123";
const NEW_PASSWORD = "NewPass#456";
const CONTEXT = { ip: "203.0.113.7", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0" };

function setup() {
  const { repo, users, resets } = createFakeRepo();
  const sent: EmailMessage[] = [];
  const events: SecurityEvent[] = [];
  let clock = Date.UTC(2026, 8, 27, 7, 0, 0);
  let failEmail = false;

  users.set("u1", {
    id: "u1",
    email: "trong@example.com",
    name: "Trọng",
    passwordHash: bcrypt.hashSync(OLD_PASSWORD, 4),
    isVerified: true,
    isBanned: false,
    lock: null,
    sessionVersion: 0,
  });
  const base = { passwordHash: bcrypt.hashSync(OLD_PASSWORD, 4), isVerified: true, isBanned: false, lock: null, sessionVersion: 0 };
  users.set("g1", { ...base, id: "g1", email: "google@example.com", name: "Google User", passwordHash: null });
  users.set("n1", { ...base, id: "n1", email: "chuaxacthuc@example.com", name: "Chưa Xác Thực", isVerified: false });
  users.set("b1", { ...base, id: "b1", email: "bikhoa@example.com", name: "Bị Khoá", isBanned: true });

  const service = createPasswordResetService({
    repo,
    secret: "test-secret",
    appUrl: "http://localhost:3000",
    bcryptRounds: 4,
    now: () => clock,
    async sendEmail(message) {
      if (failEmail) throw new Error("SMTP down");
      sent.push(message);
    },
    async logEvent(event) {
      events.push(event);
    },
  });

  return {
    service,
    users,
    resets,
    sent,
    events,
    advance(ms: number) {
      clock += ms;
    },
    setFailEmail(value: boolean) {
      failEmail = value;
    },
    lastOtp() {
      const match = sent.at(-1)?.text.match(/Mã xác thực của bạn: (\d{6})/);
      if (!match) throw new Error("Không có email OTP");
      return match[1];
    },
    lastUnlockToken() {
      const match = sent.at(-1)?.text.match(/token=([a-f0-9]{64})/);
      if (!match) throw new Error("Không có link mở khoá");
      return match[1];
    },
  };
}

const wrongOtp = (otp: string) => (otp === "000000" ? "111111" : "000000");

describe("Quên mật khẩu — gửi OTP", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("gửi OTP 6 số cho tài khoản local, chỉ lưu hash", async () => {
    const result = await t.service.requestOtp("  Trong@Example.com ", "initial", CONTEXT);
    expect(result.kind).toBe("sent");
    const otp = t.lastOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const record = t.resets.get("trong@example.com");
    expect(record?.otpHash).toBeTruthy();
    expect(record?.otpHash).not.toContain(otp);
    expect(JSON.stringify(record)).not.toContain(otp);
    if (result.kind === "sent") {
      expect(result.state.maskedEmail).toBe("tr***@example.com");
      expect(result.state.attemptsLeft).toBe(PASSWORD_RESET_CONFIG.maxOtpAttempts);
      expect(result.state.otpExpiresAt - Date.UTC(2026, 8, 27, 7, 0, 0)).toBe(PASSWORD_RESET_CONFIG.otpTtlMs);
    }
    expect(t.events).toContain("password_reset_requested");
  });

  it("email sai định dạng → invalidEmail", async () => {
    expect((await t.service.requestOtp("khong-phai-email", "initial", CONTEXT)).kind).toBe("invalidEmail");
  });

  it("email không tồn tại / chưa xác thực / bị Admin khoá → accountNotFound, không gửi mail, không tạo bản ghi", async () => {
    for (const email of ["nobody@example.com", "chuaxacthuc@example.com", "bikhoa@example.com"]) {
      expect((await t.service.requestOtp(email, "initial", CONTEXT)).kind).toBe("accountNotFound");
      expect(t.resets.has(email)).toBe(false);
    }
    expect(t.sent).toHaveLength(0);
  });

  it("tài khoản Google (không có mật khẩu) → googleAccount, không gửi mail", async () => {
    expect((await t.service.requestOtp("google@example.com", "initial", CONTEXT)).kind).toBe("googleAccount");
    expect(t.sent).toHaveLength(0);
  });

  it("vừa xác thực email xong thì quên mật khẩu được ngay", async () => {
    const user = t.users.get("n1");
    if (user) user.isVerified = true;
    expect((await t.service.requestOtp("chuaxacthuc@example.com", "initial", CONTEXT)).kind).toBe("sent");
  });

  it("SMTP lỗi → emailFailed, không tiêu hạn mức, thử lại được ngay", async () => {
    t.setFailEmail(true);
    expect((await t.service.requestOtp("trong@example.com", "initial", CONTEXT)).kind).toBe("emailFailed");
    expect(t.resets.has("trong@example.com")).toBe(false);
    t.setFailEmail(false);
    expect((await t.service.requestOtp("trong@example.com", "initial", CONTEXT)).kind).toBe("sent");
  });

  it("resend trong cooldown 60s → cooldown; qua 60s → gửi được", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    t.advance(30_000);
    const blocked = await t.service.requestOtp("trong@example.com", "resend", CONTEXT);
    expect(blocked).toMatchObject({ kind: "cooldown" });
    if (blocked.kind === "cooldown") expect(blocked.retryAfterMs).toBe(30_000);
    t.advance(30_000);
    expect((await t.service.requestOtp("trong@example.com", "resend", CONTEXT)).kind).toBe("sent");
  });

  it("bấm gửi lại ở bước 1 trong cooldown → dùng tiếp mã cũ (alreadySent), không gửi mail mới", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    t.advance(10_000);
    expect((await t.service.requestOtp("trong@example.com", "initial", CONTEXT)).kind).toBe("alreadySent");
    expect(t.sent).toHaveLength(1);
  });

  it("tối đa 5 lần gửi/giờ/email → limit; hết cửa sổ 1 giờ thì gửi lại được", async () => {
    for (let i = 0; i < PASSWORD_RESET_CONFIG.maxOtpSendsPerHour; i += 1) {
      expect((await t.service.requestOtp("trong@example.com", "resend", CONTEXT)).kind).toBe("sent");
      t.advance(PASSWORD_RESET_CONFIG.resendCooldownMs);
    }
    expect((await t.service.requestOtp("trong@example.com", "resend", CONTEXT)).kind).toBe("limit");
    t.advance(PASSWORD_RESET_CONFIG.otpSendWindowMs);
    expect((await t.service.requestOtp("trong@example.com", "resend", CONTEXT)).kind).toBe("sent");
  });
});

describe("Quên mật khẩu — xác thực OTP & khoá", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("OTP đúng → cấp reset token; dùng lại OTP đó → không còn hiệu lực", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const otp = t.lastOtp();
    const result = await t.service.verifyOtp("trong@example.com", otp, CONTEXT);
    expect(result.kind).toBe("verified");
    expect((await t.service.verifyOtp("trong@example.com", otp, CONTEXT)).kind).toBe("noActiveOtp");
  });

  it("OTP sai → báo số lần còn lại", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const result = await t.service.verifyOtp("trong@example.com", wrongOtp(t.lastOtp()), CONTEXT);
    expect(result).toEqual({ kind: "incorrect", attemptsLeft: PASSWORD_RESET_CONFIG.maxOtpAttempts - 1 });
  });

  it("OTP hết hạn sau 5 phút → expired", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const otp = t.lastOtp();
    t.advance(PASSWORD_RESET_CONFIG.otpTtlMs);
    expect((await t.service.verifyOtp("trong@example.com", otp, CONTEXT)).kind).toBe("expired");
  });

  it("OTP cũ bị vô hiệu ngay khi gửi mã mới", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const oldOtp = t.lastOtp();
    t.advance(PASSWORD_RESET_CONFIG.resendCooldownMs);
    await t.service.requestOtp("trong@example.com", "resend", CONTEXT);
    const newOtp = t.lastOtp();
    if (oldOtp !== newOtp) {
      expect((await t.service.verifyOtp("trong@example.com", oldOtp, CONTEXT)).kind).toBe("incorrect");
    }
    expect((await t.service.verifyOtp("trong@example.com", newOtp, CONTEXT)).kind).toBe("verified");
  });

  it("sai 5 lần → khoá tài khoản, gửi email cảnh báo có link mở khoá, không yêu cầu OTP được nữa", async () => {
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const otp = t.lastOtp();
    for (let i = 1; i < PASSWORD_RESET_CONFIG.maxOtpAttempts; i += 1) {
      expect((await t.service.verifyOtp("trong@example.com", wrongOtp(otp), CONTEXT)).kind).toBe("incorrect");
    }
    expect(await t.service.verifyOtp("trong@example.com", wrongOtp(otp), CONTEXT)).toEqual({ kind: "locked", justLocked: true });

    expect(t.users.get("u1")?.lock?.lockedAt).toBeInstanceOf(Date);
    expect(t.users.get("u1")?.lock?.lockIp).toBe(CONTEXT.ip);
    expect(t.sent.at(-1)?.subject).toContain("tạm khoá");
    expect(t.sent.at(-1)?.text).toContain("203.0.113.7");
    expect(t.events).toContain("account_locked");

    // OTP đúng cũng vô dụng sau khi khoá; yêu cầu mã mới bị từ chối.
    expect((await t.service.verifyOtp("trong@example.com", otp, CONTEXT)).kind).toBe("locked");
    t.advance(PASSWORD_RESET_CONFIG.resendCooldownMs);
    expect((await t.service.requestOtp("trong@example.com", "resend", CONTEXT)).kind).toBe("locked");
  });
});

describe("Quên mật khẩu — đặt mật khẩu mới", () => {
  let t: ReturnType<typeof setup>;
  let token: string;

  beforeEach(async () => {
    t = setup();
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    const verified = await t.service.verifyOtp("trong@example.com", t.lastOtp(), CONTEXT);
    if (verified.kind !== "verified") throw new Error("setup verify thất bại");
    token = verified.resetToken;
  });

  it("phiên bước 3 còn hạn → getResetSession trả email đã che", async () => {
    expect(await t.service.getResetSession(token)).toMatchObject({ maskedEmail: "tr***@example.com" });
    t.advance(PASSWORD_RESET_CONFIG.resetTokenTtlMs);
    expect(await t.service.getResetSession(token)).toBeNull();
  });

  it("đổi thành công: hash mới, tăng sessionVersion, gửi email xác nhận, token dùng 1 lần", async () => {
    const result = await t.service.resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, CONTEXT);
    expect(result.kind).toBe("success");
    const user = t.users.get("u1");
    expect(bcrypt.compareSync(NEW_PASSWORD, user?.passwordHash ?? "")).toBe(true);
    expect(user?.sessionVersion).toBe(1);
    expect(t.sent.at(-1)?.subject).toContain("đã được thay đổi");
    expect(t.resets.has("trong@example.com")).toBe(false);
    expect((await t.service.resetPassword({ token, password: "Another#789", confirmPassword: "Another#789" }, CONTEXT)).kind).toBe(
      "sessionExpired",
    );
  });

  it("trùng mật khẩu cũ / không khớp / quá yếu → báo lỗi, token vẫn dùng tiếp được", async () => {
    expect((await t.service.resetPassword({ token, password: OLD_PASSWORD, confirmPassword: OLD_PASSWORD }, CONTEXT)).kind).toBe(
      "samePassword",
    );
    expect((await t.service.resetPassword({ token, password: NEW_PASSWORD, confirmPassword: "khac#123A" }, CONTEXT)).kind).toBe(
      "mismatch",
    );
    expect((await t.service.resetPassword({ token, password: "abc", confirmPassword: "abc" }, CONTEXT)).kind).toBe("weakPassword");
    expect((await t.service.resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, CONTEXT)).kind).toBe(
      "success",
    );
  });

  it("reset token hết hạn (15 phút) hoặc bị sửa → sessionExpired", async () => {
    expect((await t.service.resetPassword({ token: "f".repeat(64), password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, CONTEXT)).kind).toBe(
      "sessionExpired",
    );
    t.advance(PASSWORD_RESET_CONFIG.resetTokenTtlMs + 1);
    expect((await t.service.resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, CONTEXT)).kind).toBe(
      "sessionExpired",
    );
  });
});

describe("Mở khoá tài khoản", () => {
  let t: ReturnType<typeof setup>;
  let unlockToken: string;

  beforeEach(async () => {
    t = setup();
    await t.service.requestOtp("trong@example.com", "initial", CONTEXT);
    for (let i = 0; i < PASSWORD_RESET_CONFIG.maxOtpAttempts; i += 1) {
      await t.service.verifyOtp("trong@example.com", "999999" === t.lastOtp() ? "888888" : "999999", CONTEXT);
    }
    unlockToken = t.lastUnlockToken();
  });

  it("link hợp lệ → mở khoá, mật khẩu cũ giữ nguyên, reset bộ đếm, gửi email; dùng lại link → invalid", async () => {
    const hashBefore = t.users.get("u1")?.passwordHash;
    expect((await t.service.unlockAccount(unlockToken, CONTEXT)).kind).toBe("unlocked");
    expect(t.users.get("u1")?.lock).toBeNull();
    expect(t.users.get("u1")?.passwordHash).toBe(hashBefore);
    expect(t.resets.has("trong@example.com")).toBe(false);
    expect(t.sent.at(-1)?.subject).toContain("mở khoá");
    expect((await t.service.unlockAccount(unlockToken, CONTEXT)).kind).toBe("invalid");
    // Mở khoá xong thì yêu cầu OTP lại bình thường.
    expect((await t.service.requestOtp("trong@example.com", "initial", CONTEXT)).kind).toBe("sent");
  });

  it("link bị sửa / sai định dạng → invalid", async () => {
    expect((await t.service.unlockAccount("a".repeat(64), CONTEXT)).kind).toBe("invalid");
    expect((await t.service.unlockAccount("not-a-token", CONTEXT)).kind).toBe("invalid");
  });

  it("link quá 24 giờ → expired; gửi lại email theo token cũ → link mới dùng được", async () => {
    t.advance(PASSWORD_RESET_CONFIG.unlockTokenTtlMs);
    expect((await t.service.unlockAccount(unlockToken, CONTEXT)).kind).toBe("expired");
    expect((await t.service.resendUnlockEmail({ token: unlockToken }, CONTEXT)).kind).toBe("accepted");
    const freshToken = t.lastUnlockToken();
    expect(freshToken).not.toBe(unlockToken);
    expect((await t.service.unlockAccount(unlockToken, CONTEXT)).kind).toBe("invalid");
    expect((await t.service.unlockAccount(freshToken, CONTEXT)).kind).toBe("unlocked");
  });

  it("gửi lại email mở khoá có cooldown và giới hạn/giờ", async () => {
    expect((await t.service.resendUnlockEmail({ email: "trong@example.com" }, CONTEXT)).kind).toBe("cooldown");
    t.advance(PASSWORD_RESET_CONFIG.unlockEmailCooldownMs);
    expect((await t.service.resendUnlockEmail({ email: "trong@example.com" }, CONTEXT)).kind).toBe("accepted");
    t.advance(PASSWORD_RESET_CONFIG.unlockEmailCooldownMs);
    expect((await t.service.resendUnlockEmail({ email: "trong@example.com" }, CONTEXT)).kind).toBe("accepted");
    t.advance(PASSWORD_RESET_CONFIG.unlockEmailCooldownMs);
    expect((await t.service.resendUnlockEmail({ email: "trong@example.com" }, CONTEXT)).kind).toBe("limit");
  });

  it("gửi lại email mở khoá cho email không bị khoá / không tồn tại → accepted chung chung, không gửi mail", async () => {
    const before = t.sent.length;
    expect((await t.service.resendUnlockEmail({ email: "nobody@example.com" }, CONTEXT)).kind).toBe("accepted");
    expect((await t.service.resendUnlockEmail({ email: "google@example.com" }, CONTEXT)).kind).toBe("accepted");
    expect(t.sent.length).toBe(before);
  });
});

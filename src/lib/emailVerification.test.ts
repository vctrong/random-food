import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { EMAIL_VERIFICATION_CONFIG } from "@/constants/emailVerification";
import type { EmailMessage } from "@/lib/email/mailer";
import {
  createEmailVerificationService,
  type EmailVerificationRepository,
  type VerificationRecord,
  type VerificationUser,
} from "./emailVerification";

interface FakeUser extends Omit<VerificationUser, "hasPassword"> {
  passwordHash: string | null;
  isLocked: boolean;
  hasGoogleAccount: boolean;
}

/** Repo giả trong bộ nhớ — giữ đúng các điều kiện nguyên tử của bản Mongo (emailVerificationStore.ts). */
function createFakeRepo() {
  const users = new Map<string, FakeUser>();
  const records = new Map<string, VerificationRecord>();
  const toUser = (user: FakeUser): VerificationUser => ({
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    hasPassword: Boolean(user.passwordHash),
  });
  const repo: EmailVerificationRepository = {
    async findUser(id) {
      const user = users.get(id);
      return user ? toUser(user) : null;
    },
    async findAccountByEmail(email) {
      const user = [...users.values()].find((candidate) => candidate.email === email);
      return user ? { ...toUser(user), isLocked: user.isLocked, hasGoogleAccount: user.hasGoogleAccount } : null;
    },
    async findRecord(id) {
      const record = records.get(id);
      return record ? { ...record, sendHistory: [...record.sendHistory] } : null;
    },
    async saveOtp(userId, input) {
      const isLink = input.purpose === "link_password";
      records.set(userId, {
        userId,
        purpose: input.purpose,
        otpHash: input.otpHash,
        otpExpiresAt: input.otpExpiresAt,
        attempts: 0,
        sendHistory: input.sendHistory,
        pendingPasswordHash: isLink ? (input.pendingPasswordHash ?? null) : null,
        flowTokenHash: isLink ? (input.flowTokenHash ?? null) : null,
      });
    },
    async updatePendingPassword(userId, flowTokenHash, pendingPasswordHash) {
      const record = records.get(userId);
      if (!record || record.purpose !== "link_password" || record.flowTokenHash !== flowTokenHash) return false;
      record.pendingPasswordHash = pendingPasswordHash;
      return true;
    },
    async registerFailedAttempt(userId, otpHash, max) {
      const record = records.get(userId);
      if (!record || record.otpHash !== otpHash || record.attempts >= max) return null;
      record.attempts += 1;
      return record.attempts;
    },
    async invalidateOtp(userId) {
      const record = records.get(userId);
      if (record) Object.assign(record, { otpHash: null, otpExpiresAt: null });
    },
    async consumeOtp(userId, otpHash, max) {
      const record = records.get(userId);
      if (!record || record.otpHash !== otpHash || record.attempts >= max) return false;
      records.delete(userId);
      return true;
    },
    async markUserVerified(userId) {
      const user = users.get(userId);
      if (user) user.isVerified = true;
    },
    async setPasswordIfMissing(userId, passwordHash) {
      const user = users.get(userId);
      if (!user || user.passwordHash) return false;
      Object.assign(user, { passwordHash, isVerified: true });
      return true;
    },
  };
  return { repo, users, records };
}

const CONTEXT = { ip: "203.0.113.7", userAgent: "Vitest" };
const NEW_PASSWORD = "MatKhau@123";
const BASE_USER = { isBanned: false, isLocked: false, hasGoogleAccount: false, passwordHash: "hash-cu" };

function setup() {
  const { repo, users, records } = createFakeRepo();
  const sent: EmailMessage[] = [];
  let clock = Date.UTC(2026, 8, 27, 7, 0, 0);
  let failEmail = false;
  users.set("u1", { ...BASE_USER, id: "u1", email: "trong@example.com", name: "Trọng", isVerified: false });
  users.set("v1", { ...BASE_USER, id: "v1", email: "daxacthuc@example.com", name: "Đã Xác Thực", isVerified: true });
  // Tài khoản chỉ có Google (không mật khẩu): chưa xác thực / đã xác thực (dữ liệu cũ) / bị Admin khoá.
  users.set("g1", { ...BASE_USER, id: "g1", email: "google@example.com", name: "Google", isVerified: false, passwordHash: null, hasGoogleAccount: true });
  users.set("g2", { ...BASE_USER, id: "g2", email: "google-cu@example.com", name: "Google Cũ", isVerified: true, passwordHash: null, hasGoogleAccount: true });
  users.set("g3", { ...BASE_USER, id: "g3", email: "google-khoa@example.com", name: "Bị Khoá", isVerified: false, passwordHash: null, hasGoogleAccount: true, isBanned: true });

  const service = createEmailVerificationService({
    repo,
    secret: "test-secret",
    now: () => clock,
    bcryptRounds: 4,
    async sendEmail(message) {
      if (failEmail) throw new Error("SMTP down");
      sent.push(message);
    },
    async logEvent() {},
  });

  return {
    service,
    users,
    records,
    sent,
    advance(ms: number) {
      clock += ms;
    },
    setFailEmail(value: boolean) {
      failEmail = value;
    },
    lastCode() {
      const match = sent.at(-1)?.text.match(/(?:Mã xác thực email của bạn|hãy nhập mã xác thực): (\d{6})/);
      if (!match) throw new Error("Không có email mã xác thực");
      return match[1];
    },
  };
}

const wrongOf = (code: string) => (code === "000000" ? "111111" : "000000");

describe("Xác thực email", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("gửi mã 6 số, chỉ lưu hash; getStatus trả mã đang chờ để reload vẫn nhập tiếp", async () => {
    const result = await t.service.sendCode("u1", CONTEXT);
    expect(result.kind).toBe("sent");
    const code = t.lastCode();
    expect(JSON.stringify(t.records.get("u1"))).not.toContain(code);
    expect(t.sent[0].subject).toContain("xác thực email");
    const status = await t.service.getStatus("u1");
    expect(status?.isVerified).toBe(false);
    expect(status?.pending?.otpExpiresAt).toBe(Date.UTC(2026, 8, 27, 7, 0, 0) + EMAIL_VERIFICATION_CONFIG.otpTtlMs);
  });

  it("mã đúng → isVerified = true, xoá bản ghi; tài khoản đã xác thực không gửi mã nữa", async () => {
    await t.service.sendCode("u1", CONTEXT);
    expect((await t.service.confirmCode("u1", t.lastCode(), CONTEXT)).kind).toBe("verified");
    expect(t.users.get("u1")?.isVerified).toBe(true);
    expect(t.records.has("u1")).toBe(false);
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("alreadyVerified");
    expect((await t.service.sendCode("v1", CONTEXT)).kind).toBe("alreadyVerified");
  });

  it("mã sai → còn N lần; sai 5 lần → huỷ mã (không khoá tài khoản), mã đúng cũng hết dùng được", async () => {
    await t.service.sendCode("u1", CONTEXT);
    const code = t.lastCode();
    for (let i = 1; i < EMAIL_VERIFICATION_CONFIG.maxOtpAttempts; i += 1) {
      expect(await t.service.confirmCode("u1", wrongOf(code), CONTEXT)).toEqual({
        kind: "incorrect",
        attemptsLeft: EMAIL_VERIFICATION_CONFIG.maxOtpAttempts - i,
      });
    }
    expect((await t.service.confirmCode("u1", wrongOf(code), CONTEXT)).kind).toBe("tooManyAttempts");
    expect((await t.service.confirmCode("u1", code, CONTEXT)).kind).toBe("noActiveCode");
    expect(t.users.get("u1")?.isVerified).toBe(false);
    t.advance(EMAIL_VERIFICATION_CONFIG.resendCooldownMs);
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("sent");
  });

  it("mã hết hạn sau 10 phút; mã cũ vô hiệu khi gửi mã mới", async () => {
    await t.service.sendCode("u1", CONTEXT);
    const first = t.lastCode();
    t.advance(EMAIL_VERIFICATION_CONFIG.otpTtlMs);
    expect((await t.service.confirmCode("u1", first, CONTEXT)).kind).toBe("expired");
    await t.service.sendCode("u1", CONTEXT);
    const second = t.lastCode();
    if (second !== first) expect((await t.service.confirmCode("u1", first, CONTEXT)).kind).toBe("incorrect");
    expect((await t.service.confirmCode("u1", second, CONTEXT)).kind).toBe("verified");
  });

  it("cooldown 60s và tối đa 5 mã/giờ", async () => {
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("sent");
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("cooldown");
    for (let i = 1; i < EMAIL_VERIFICATION_CONFIG.maxSendsPerHour; i += 1) {
      t.advance(EMAIL_VERIFICATION_CONFIG.resendCooldownMs);
      expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("sent");
    }
    t.advance(EMAIL_VERIFICATION_CONFIG.resendCooldownMs);
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("limit");
  });

  it("SMTP lỗi → emailFailed, không tính lượt gửi", async () => {
    t.setFailEmail(true);
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("emailFailed");
    t.setFailEmail(false);
    expect((await t.service.sendCode("u1", CONTEXT)).kind).toBe("sent");
  });

  it("mã sai định dạng → invalidInput; chưa gửi mã → noActiveCode", async () => {
    expect((await t.service.confirmCode("u1", "12ab56", CONTEXT)).kind).toBe("invalidInput");
    expect((await t.service.confirmCode("u1", "123456", CONTEXT)).kind).toBe("noActiveCode");
  });
});

describe("Đăng ký bằng email của tài khoản chỉ có Google (thêm mật khẩu)", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  async function start(email = "google@example.com", password = NEW_PASSWORD, flowToken: string | null = null) {
    const result = await t.service.startPasswordLink({ email, password, flowToken }, CONTEXT);
    if (result.kind !== "sent") throw new Error(`Không gửi được mã: ${result.kind}`);
    return result.flowToken;
  }

  it("checkEmail phân 3 trường hợp + email sai định dạng", async () => {
    expect((await t.service.checkEmail("moi@example.com")).kind).toBe("available");
    expect((await t.service.checkEmail("  TRONG@example.com ")).kind).toBe("taken");
    expect((await t.service.checkEmail("google@example.com")).kind).toBe("googleOnly");
    expect((await t.service.checkEmail("khong-phai-email")).kind).toBe("invalidEmail");
  });

  it("gửi mã nhưng CHƯA gán mật khẩu; chỉ lưu hash (không lưu mật khẩu/OTP thô)", async () => {
    await start();
    const code = t.lastCode();
    expect(t.users.get("g1")?.passwordHash).toBeNull();
    const record = t.records.get("g1");
    expect(record?.purpose).toBe("link_password");
    expect(JSON.stringify(record)).not.toContain(NEW_PASSWORD);
    expect(JSON.stringify(record)).not.toContain(code);
    expect(bcrypt.compareSync(NEW_PASSWORD, record?.pendingPasswordHash ?? "")).toBe(true);
  });

  it("mã đúng + đúng trình duyệt → gán mật khẩu vào tài khoản CŨ, bật isVerified, mã chỉ dùng 1 lần", async () => {
    const flowToken = await start();
    const code = t.lastCode();
    expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: code, flowToken }, CONTEXT)).kind).toBe("linked");
    const user = t.users.get("g1");
    expect(bcrypt.compareSync(NEW_PASSWORD, user?.passwordHash ?? "")).toBe(true);
    expect(user?.isVerified).toBe(true);
    expect(t.records.has("g1")).toBe(false);
    expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: code, flowToken }, CONTEXT)).kind).toBe(
      "alreadyHasPassword",
    );
    expect((await t.service.checkEmail("google@example.com")).kind).toBe("taken");
  });

  it("mã đúng nhưng khác trình duyệt (thiếu/sai cookie) → sessionInvalid, không gán mật khẩu", async () => {
    await start();
    const code = t.lastCode();
    for (const flowToken of [null, "a".repeat(64)]) {
      expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: code, flowToken }, CONTEXT)).kind).toBe(
        "sessionInvalid",
      );
    }
    expect(t.users.get("g1")?.passwordHash).toBeNull();
  });

  it("mã sai → còn N lần; sai 5 lần → huỷ mã; gửi lại (sau cooldown) giữ nguyên mật khẩu chờ gán", async () => {
    const flowToken = await start();
    const code = t.lastCode();
    const input = { email: "google@example.com", otp: wrongOf(code), flowToken };
    for (let i = 1; i < EMAIL_VERIFICATION_CONFIG.maxOtpAttempts; i += 1) {
      expect((await t.service.confirmPasswordLink(input, CONTEXT)).kind).toBe("incorrect");
    }
    expect((await t.service.confirmPasswordLink(input, CONTEXT)).kind).toBe("tooManyAttempts");
    expect((await t.service.confirmPasswordLink({ ...input, otp: code }, CONTEXT)).kind).toBe("noActiveCode");

    expect((await t.service.resendPasswordLinkCode({ email: "google@example.com", flowToken }, CONTEXT)).kind).toBe("cooldown");
    t.advance(EMAIL_VERIFICATION_CONFIG.resendCooldownMs);
    expect((await t.service.resendPasswordLinkCode({ email: "google@example.com", flowToken: null }, CONTEXT)).kind).toBe(
      "sessionInvalid",
    );
    expect((await t.service.resendPasswordLinkCode({ email: "google@example.com", flowToken }, CONTEXT)).kind).toBe("sent");
    expect((await t.service.confirmPasswordLink({ ...input, otp: t.lastCode() }, CONTEXT)).kind).toBe("linked");
    expect(bcrypt.compareSync(NEW_PASSWORD, t.users.get("g1")?.passwordHash ?? "")).toBe(true);
  });

  it("mã hết hạn sau 10 phút", async () => {
    const flowToken = await start();
    t.advance(EMAIL_VERIFICATION_CONFIG.otpTtlMs);
    expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: t.lastCode(), flowToken }, CONTEXT)).kind).toBe(
      "expired",
    );
  });

  it("quay lại sửa mật khẩu trong lúc mã còn hạn (cùng trình duyệt) → không gửi mã mới, dùng mật khẩu mới", async () => {
    const flowToken = await start();
    const code = t.lastCode();
    expect(await start("google@example.com", "KhacHan#456", flowToken)).toBe(flowToken);
    expect(t.sent).toHaveLength(1);
    expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: code, flowToken }, CONTEXT)).kind).toBe("linked");
    expect(bcrypt.compareSync("KhacHan#456", t.users.get("g1")?.passwordHash ?? "")).toBe(true);
  });

  it("chặn ở server: mật khẩu yếu, email chưa có / đã có mật khẩu, tài khoản bị khoá", async () => {
    const run = (email: string, password = NEW_PASSWORD) => t.service.startPasswordLink({ email, password, flowToken: null }, CONTEXT);
    expect((await run("google@example.com", "yeu")).kind).toBe("weakPassword");
    expect((await run("moi@example.com")).kind).toBe("available");
    expect((await run("trong@example.com")).kind).toBe("taken");
    expect((await run("google-khoa@example.com")).kind).toBe("unavailable");
    expect(t.sent).toHaveLength(0);
  });

  it("mã của luồng thêm mật khẩu không dùng được để xác thực email ở Hồ sơ (và ngược lại)", async () => {
    const flowToken = await start();
    const linkCode = t.lastCode();
    expect((await t.service.confirmCode("g1", linkCode, CONTEXT)).kind).toBe("noActiveCode");
    expect((await t.service.getStatus("g1"))?.pending).toBeNull();

    t.advance(EMAIL_VERIFICATION_CONFIG.resendCooldownMs);
    await t.service.sendCode("g1", CONTEXT);
    const verifyCode = t.lastCode();
    expect(t.records.get("g1")?.pendingPasswordHash).toBeNull();
    expect((await t.service.confirmPasswordLink({ email: "google@example.com", otp: verifyCode, flowToken }, CONTEXT)).kind).toBe(
      "sessionInvalid",
    );
    expect((await t.service.confirmCode("g1", verifyCode, CONTEXT)).kind).toBe("verified");
    expect(t.users.get("g1")?.passwordHash).toBeNull();
  });
});

describe("Tạo mật khẩu đầu tiên trong Hồ sơ", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("chưa xác thực email → notVerified; đã xác thực → tạo được; lần 2 → alreadyHasPassword", async () => {
    expect((await t.service.setInitialPassword("g1", NEW_PASSWORD, NEW_PASSWORD, CONTEXT)).kind).toBe("notVerified");
    expect((await t.service.setInitialPassword("g2", NEW_PASSWORD, NEW_PASSWORD, CONTEXT)).kind).toBe("created");
    expect(bcrypt.compareSync(NEW_PASSWORD, t.users.get("g2")?.passwordHash ?? "")).toBe(true);
    expect((await t.service.setInitialPassword("g2", "KhacHan#456", "KhacHan#456", CONTEXT)).kind).toBe("alreadyHasPassword");
    expect(bcrypt.compareSync(NEW_PASSWORD, t.users.get("g2")?.passwordHash ?? "")).toBe(true);
  });

  it("tài khoản đã có mật khẩu → alreadyHasPassword; không khớp / yếu → báo lỗi", async () => {
    expect((await t.service.setInitialPassword("v1", NEW_PASSWORD, NEW_PASSWORD, CONTEXT)).kind).toBe("alreadyHasPassword");
    expect((await t.service.setInitialPassword("g2", NEW_PASSWORD, "khac", CONTEXT)).kind).toBe("mismatch");
    expect((await t.service.setInitialPassword("g2", "yeu", "yeu", CONTEXT)).kind).toBe("weakPassword");
    expect(t.users.get("g2")?.passwordHash).toBeNull();
  });

  it("getStatus trả hasPassword để Hồ sơ biết có cần bước tạo mật khẩu", async () => {
    expect((await t.service.getStatus("g2"))?.hasPassword).toBe(false);
    expect((await t.service.getStatus("v1"))?.hasPassword).toBe(true);
  });
});

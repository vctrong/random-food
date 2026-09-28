import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { PasswordReset } from "@/lib/models/PasswordReset";
import { Log } from "@/lib/models/Log";
import { createNotification } from "@/lib/notify";
import { sendEmail } from "@/lib/email/mailer";
import {
  createPasswordResetService,
  type PasswordResetRepository,
  type PasswordResetService,
  type ResetRecord,
  type ResetUser,
  type ResetUserLock,
} from "@/lib/passwordReset";

/** Nối service Quên mật khẩu với MongoDB/SMTP thật. Mọi thao tác "đếm/tiêu" đều là 1 lệnh nguyên tử. */

interface RawLock {
  lockedAt?: Date;
  unlockTokenHash?: string;
  unlockTokenExpiresAt?: Date;
  unlockEmailHistory?: Date[];
  lockIp?: string;
  lockUserAgent?: string;
}

interface RawUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string | null;
  isVerified?: boolean;
  accountStatus?: string;
  securityLock?: RawLock | null;
}

interface RawReset {
  email: string;
  userId?: Types.ObjectId | null;
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
  attempts?: number;
  sendHistory?: Date[];
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
  lockedAt?: Date | null;
}

const USER_FIELDS = "email name passwordHash isVerified accountStatus securityLock";

function toUser(raw: RawUser | null): ResetUser | null {
  if (!raw) return null;
  const lock = raw.securityLock?.lockedAt
    ? {
        lockedAt: raw.securityLock.lockedAt,
        unlockTokenHash: raw.securityLock.unlockTokenHash ?? null,
        unlockTokenExpiresAt: raw.securityLock.unlockTokenExpiresAt ?? null,
        unlockEmailHistory: raw.securityLock.unlockEmailHistory ?? [],
        lockIp: raw.securityLock.lockIp ?? null,
        lockUserAgent: raw.securityLock.lockUserAgent ?? null,
      }
    : null;
  return {
    id: raw._id.toString(),
    email: raw.email,
    name: raw.name,
    passwordHash: raw.passwordHash ?? null,
    isVerified: raw.isVerified === true,
    isBanned: raw.accountStatus === "banned",
    lock,
  };
}

function toRecord(raw: RawReset | null): ResetRecord | null {
  if (!raw) return null;
  return {
    email: raw.email,
    userId: raw.userId ? raw.userId.toString() : null,
    otpHash: raw.otpHash ?? null,
    otpExpiresAt: raw.otpExpiresAt ?? null,
    attempts: raw.attempts ?? 0,
    sendHistory: raw.sendHistory ?? [],
    resetTokenHash: raw.resetTokenHash ?? null,
    resetTokenExpiresAt: raw.resetTokenExpiresAt ?? null,
    lockedAt: raw.lockedAt ?? null,
  };
}

const objectIdOrNull = (id: string | null) => (id ? new Types.ObjectId(id) : null);

export const mongoPasswordResetRepository: PasswordResetRepository = {
  async findUserByEmail(email) {
    await connectDB();
    return toUser((await User.findOne({ email }).select(USER_FIELDS).lean()) as RawUser | null);
  },
  async findUserById(id) {
    if (!Types.ObjectId.isValid(id)) return null;
    await connectDB();
    return toUser((await User.findById(id).select(USER_FIELDS).lean()) as RawUser | null);
  },
  async findUserByUnlockTokenHash(tokenHash) {
    await connectDB();
    return toUser((await User.findOne({ "securityLock.unlockTokenHash": tokenHash }).select(USER_FIELDS).lean()) as RawUser | null);
  },
  async findReset(email) {
    await connectDB();
    return toRecord((await PasswordReset.findOne({ email }).lean()) as RawReset | null);
  },
  async findResetByTokenHash(tokenHash) {
    await connectDB();
    return toRecord((await PasswordReset.findOne({ resetTokenHash: tokenHash }).lean()) as RawReset | null);
  },
  async saveOtp(email, { userId, otpHash, otpExpiresAt, sendHistory, expireAt }) {
    await connectDB();
    await PasswordReset.updateOne(
      { email },
      {
        $set: { userId: objectIdOrNull(userId), otpHash, otpExpiresAt, attempts: 0, sendHistory, expireAt },
        $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, lockedAt: 1 },
      },
      { upsert: true },
    );
  },
  async registerFailedAttempt(email, otpHash, maxAttempts) {
    await connectDB();
    const updated = (await PasswordReset.findOneAndUpdate(
      { email, otpHash, attempts: { $lt: maxAttempts } },
      { $inc: { attempts: 1 } },
      { new: true },
    ).lean()) as RawReset | null;
    return updated ? (updated.attempts ?? 0) : null;
  },
  async exchangeOtpForResetToken(email, { otpHash, maxAttempts, tokenHash, tokenExpiresAt, expireAt }) {
    await connectDB();
    const result = await PasswordReset.updateOne(
      { email, otpHash, attempts: { $lt: maxAttempts }, lockedAt: { $exists: false } },
      {
        $set: { resetTokenHash: tokenHash, resetTokenExpiresAt: tokenExpiresAt, expireAt },
        $unset: { otpHash: 1, otpExpiresAt: 1 },
      },
    );
    return result.modifiedCount === 1;
  },
  async markResetLocked(email, { userId, lockedAt, expireAt }) {
    await connectDB();
    await PasswordReset.updateOne(
      { email },
      {
        $set: { userId: objectIdOrNull(userId), lockedAt, expireAt },
        $unset: { otpHash: 1, otpExpiresAt: 1, resetTokenHash: 1, resetTokenExpiresAt: 1 },
      },
      { upsert: true },
    );
  },
  async consumeResetToken(tokenHash, now) {
    await connectDB();
    return toRecord(
      (await PasswordReset.findOneAndDelete({ resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: now } }).lean()) as RawReset | null,
    );
  },
  async deleteReset(email) {
    await connectDB();
    await PasswordReset.deleteOne({ email });
  },
  async lockUser(userId, lock: ResetUserLock) {
    await connectDB();
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          securityLock: {
            lockedAt: lock.lockedAt,
            reason: "otp_failed",
            unlockTokenHash: lock.unlockTokenHash,
            unlockTokenExpiresAt: lock.unlockTokenExpiresAt,
            unlockEmailHistory: lock.unlockEmailHistory,
            lockIp: lock.lockIp ?? undefined,
            lockUserAgent: lock.lockUserAgent ?? undefined,
          },
        },
      },
    );
  },
  async updateUnlockToken(userId, { tokenHash, expiresAt, unlockEmailHistory }) {
    await connectDB();
    await User.updateOne(
      { _id: userId, "securityLock.lockedAt": { $exists: true } },
      {
        $set: {
          "securityLock.unlockTokenHash": tokenHash,
          "securityLock.unlockTokenExpiresAt": expiresAt,
          "securityLock.unlockEmailHistory": unlockEmailHistory,
        },
      },
    );
  },
  async unlockUser(userId, tokenHash) {
    await connectDB();
    const result = await User.updateOne(
      { _id: userId, "securityLock.unlockTokenHash": tokenHash },
      { $unset: { securityLock: 1 } },
    );
    return result.modifiedCount === 1;
  },
  async updatePassword(userId, passwordHash) {
    await connectDB();
    // Tăng sessionVersion → callbacks.session() (lib/auth.ts) đăng xuất mọi thiết bị đang đăng nhập.
    await User.updateOne({ _id: userId }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } });
  },
};

let service: PasswordResetService | null = null;

export function getPasswordResetService(): PasswordResetService {
  if (!service) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Thiếu biến môi trường NEXTAUTH_SECRET");
    service = createPasswordResetService({
      repo: mongoPasswordResetRepository,
      sendEmail,
      secret,
      appUrl: (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
      async logEvent(event, { userId, ip, userAgent, metadata }) {
        try {
          await connectDB();
          await Log.create({
            userId: userId ? new Types.ObjectId(userId) : undefined,
            action: event,
            metadata: metadata ?? {},
            ip: ip ?? undefined,
            userAgent: userAgent ?? undefined,
          });
        } catch {
          // Log bảo mật hỏng không được làm hỏng luồng chính của người dùng.
        }
      },
      async onPasswordChanged(userId) {
        await createNotification({
          userId,
          type: "password_changed",
          message: "Mật khẩu của bạn vừa được đặt lại qua “Quên mật khẩu”. Các thiết bị khác đã bị đăng xuất.",
        });
      },
    });
  }
  return service;
}

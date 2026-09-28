import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { EmailVerification } from "@/lib/models/EmailVerification";
import { Log } from "@/lib/models/Log";
import { sendEmail } from "@/lib/email/mailer";
import {
  createEmailVerificationService,
  type AccountLookup,
  type EmailVerificationRepository,
  type EmailVerificationService,
  type VerificationRecord,
  type VerificationUser,
} from "@/lib/emailVerification";

/** Nối service xác thực email với MongoDB/SMTP thật. Mọi thao tác "đếm/tiêu" là 1 lệnh nguyên tử. */

interface RawRecord {
  userId: Types.ObjectId;
  purpose?: "verify" | "link_password";
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
  attempts?: number;
  sendHistory?: Date[];
  pendingPasswordHash?: string | null;
  flowTokenHash?: string | null;
}

interface RawUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string | null;
  isVerified?: boolean;
  accountStatus?: string;
  securityLock?: { lockedAt?: Date } | null;
}

const USER_FIELDS = "email name passwordHash isVerified accountStatus securityLock";

function toUser(raw: RawUser): VerificationUser {
  return {
    id: raw._id.toString(),
    email: raw.email,
    name: raw.name,
    isVerified: raw.isVerified === true,
    isBanned: raw.accountStatus === "banned",
    hasPassword: Boolean(raw.passwordHash),
  };
}

/** Tài khoản chưa có mật khẩu: field không tồn tại hoặc null/rỗng (adapter NextAuth không tạo field này). */
const NO_PASSWORD = { $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }, { passwordHash: "" }] };

function toRecord(raw: RawRecord | null): VerificationRecord | null {
  if (!raw) return null;
  return {
    userId: raw.userId.toString(),
    purpose: raw.purpose ?? "verify",
    otpHash: raw.otpHash ?? null,
    otpExpiresAt: raw.otpExpiresAt ?? null,
    attempts: raw.attempts ?? 0,
    sendHistory: raw.sendHistory ?? [],
    pendingPasswordHash: raw.pendingPasswordHash ?? null,
    flowTokenHash: raw.flowTokenHash ?? null,
  };
}

export const mongoEmailVerificationRepository: EmailVerificationRepository = {
  async findUser(userId) {
    if (!Types.ObjectId.isValid(userId)) return null;
    await connectDB();
    const raw = (await User.findById(userId).select(USER_FIELDS).lean()) as RawUser | null;
    return raw ? toUser(raw) : null;
  },
  async findAccountByEmail(email): Promise<AccountLookup | null> {
    const mongoose = await connectDB();
    const raw = (await User.findOne({ email }).select(USER_FIELDS).lean()) as RawUser | null;
    if (!raw) return null;
    // Collection `accounts` do NextAuth MongoDBAdapter quản lý — chỉ đọc, không sửa.
    const googleAccount = await mongoose.connection.db
      ?.collection("accounts")
      .findOne({ userId: raw._id, provider: "google" }, { projection: { _id: 1 } });
    return { ...toUser(raw), isLocked: Boolean(raw.securityLock?.lockedAt), hasGoogleAccount: Boolean(googleAccount) };
  },
  async findRecord(userId) {
    await connectDB();
    return toRecord((await EmailVerification.findOne({ userId }).lean()) as RawRecord | null);
  },
  async saveOtp(userId, { email, otpHash, otpExpiresAt, sendHistory, expireAt, purpose, pendingPasswordHash, flowTokenHash }) {
    await connectDB();
    const linkFields = purpose === "link_password" && pendingPasswordHash && flowTokenHash;
    await EmailVerification.updateOne(
      { userId },
      {
        $set: {
          email,
          otpHash,
          otpExpiresAt,
          attempts: 0,
          sendHistory,
          expireAt,
          purpose,
          ...(linkFields && { pendingPasswordHash, flowTokenHash }),
        },
        ...(!linkFields && { $unset: { pendingPasswordHash: 1, flowTokenHash: 1 } }),
      },
      { upsert: true },
    );
  },
  async updatePendingPassword(userId, flowTokenHash, pendingPasswordHash) {
    await connectDB();
    const result = await EmailVerification.updateOne(
      { userId, purpose: "link_password", flowTokenHash },
      { $set: { pendingPasswordHash } },
    );
    return result.modifiedCount === 1;
  },
  async registerFailedAttempt(userId, otpHash, maxAttempts) {
    await connectDB();
    const updated = (await EmailVerification.findOneAndUpdate(
      { userId, otpHash, attempts: { $lt: maxAttempts } },
      { $inc: { attempts: 1 } },
      { new: true },
    ).lean()) as RawRecord | null;
    return updated ? (updated.attempts ?? 0) : null;
  },
  async invalidateOtp(userId) {
    await connectDB();
    await EmailVerification.updateOne({ userId }, { $unset: { otpHash: 1, otpExpiresAt: 1 } });
  },
  async consumeOtp(userId, otpHash, maxAttempts) {
    await connectDB();
    const result = await EmailVerification.deleteOne({ userId, otpHash, attempts: { $lt: maxAttempts } });
    return result.deletedCount === 1;
  },
  async markUserVerified(userId) {
    await connectDB();
    await User.updateOne({ _id: userId }, { $set: { isVerified: true } });
  },
  async setPasswordIfMissing(userId, passwordHash) {
    await connectDB();
    const result = await User.updateOne({ _id: userId, ...NO_PASSWORD }, { $set: { passwordHash, isVerified: true } });
    return result.modifiedCount === 1;
  },
};

let service: EmailVerificationService | null = null;

export function getEmailVerificationService(): EmailVerificationService {
  if (!service) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Thiếu biến môi trường NEXTAUTH_SECRET");
    service = createEmailVerificationService({
      repo: mongoEmailVerificationRepository,
      sendEmail,
      secret,
      async logEvent(event, { userId, ip, userAgent, metadata }) {
        try {
          await connectDB();
          await Log.create({
            userId: new Types.ObjectId(userId),
            action: event,
            metadata: metadata ?? {},
            ip: ip ?? undefined,
            userAgent: userAgent ?? undefined,
          });
        } catch {
          // Log hỏng không được làm hỏng luồng chính.
        }
      },
    });
  }
  return service;
}

import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  phone: { type: String },
  role: { type: String, enum: ["user", "foodreviewer", "admin"], default: "user" },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  googleId: { type: String },
  accountStatus: { type: String, enum: ["active", "banned"], default: "active" },
  warningCount: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  /** Tăng lên để thu hồi (revoke) mọi session đang hoạt động — dùng cho "Đăng xuất
   * khỏi mọi thiết bị", đổi mật khẩu, hoặc khoá tài khoản. Kiểm tra trong
   * callbacks.session() của NextAuth (chạy lại mỗi request), không chỉ ở client. */
  sessionVersion: { type: Number, default: 0 },
  /** Mốc hoạt động gần nhất — dùng để tự động hết hạn phiên không "ghi nhớ đăng
   * nhập" sau 30 phút không hoạt động (IDLE_LIMIT_MS trong lib/auth.ts). */
  lastActiveAt: { type: Date },
  /** Tạm khoá do nhập sai OTP quên mật khẩu quá số lần (docs/forgot-password.md).
   * Khác accountStatus "banned" (Admin khoá): người dùng tự mở bằng link trong email.
   * Không có field này = không bị khoá. Chỉ lưu hash của token mở khoá. */
  securityLock: {
    type: new Schema(
      {
        lockedAt: { type: Date, required: true },
        reason: { type: String, enum: ["otp_failed"], default: "otp_failed" },
        unlockTokenHash: { type: String },
        unlockTokenExpiresAt: { type: Date },
        unlockEmailHistory: { type: [Date], default: [] },
        lockIp: { type: String },
        lockUserAgent: { type: String },
      },
      { _id: false },
    ),
    default: undefined,
  },
});

userSchema.index({ "securityLock.unlockTokenHash": 1 }, { sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = models.User ?? model("User", userSchema);

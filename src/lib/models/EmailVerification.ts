import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Phiên xác thực email của 1 tài khoản — tối đa 1 bản ghi / user nên mã mới luôn
 * ghi đè mã cũ (kể cả khác `purpose`). Chỉ lưu HASH (HMAC-SHA256) của OTP. Xác
 * thực xong thì xoá bản ghi và bật users.isVerified. Tự xoá qua TTL.
 *
 * - purpose "verify": xác thực email trong trang Hồ sơ (đang đăng nhập).
 * - purpose "link_password": đăng ký bằng email của tài khoản chỉ có Google — mật
 *   khẩu vừa nhập chỉ được lưu dạng bcrypt ở `pendingPasswordHash`, và CHỈ gán vào
 *   users.passwordHash sau khi OTP đúng. `flowTokenHash` gắn phiên với trình duyệt
 *   đã bắt đầu (token thô nằm trong cookie httpOnly) — người khác có mã OTP cũng
 *   không xác nhận được từ trình duyệt khác. Bản ghi loại này sống tối đa 1 giờ.
 */
const emailVerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  /** Địa chỉ đã gửi mã tới (email của tài khoản lúc gửi). */
  email: { type: String, required: true, lowercase: true, trim: true },
  otpHash: { type: String },
  otpExpiresAt: { type: Date },
  /** Số lần nhập sai mã hiện tại — về 0 khi gửi mã mới; đủ ngưỡng thì mã bị huỷ. */
  attempts: { type: Number, default: 0 },
  /** Các mốc đã gửi mã (chỉ giữ trong cửa sổ 1 giờ) — cooldown + giới hạn/giờ. */
  sendHistory: { type: [Date], default: [] },
  purpose: { type: String, enum: ["verify", "link_password"], default: "verify" },
  pendingPasswordHash: { type: String },
  flowTokenHash: { type: String },
  expireAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

emailVerificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerificationDocument = InferSchemaType<typeof emailVerificationSchema>;

export const EmailVerification = models.EmailVerification ?? model("EmailVerification", emailVerificationSchema);

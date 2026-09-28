import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Phiên "Quên mật khẩu" — tối đa 1 bản ghi / email (upsert), nên OTP/reset token
 * mới luôn ghi đè cái cũ: mở nhiều tab hay gửi song song thì chỉ cái mới nhất hợp lệ.
 * Chỉ lưu HASH (HMAC-SHA256) của OTP và reset token, không bao giờ lưu bản thô.
 * Email không tồn tại vẫn có bản ghi (userId null) để hành vi/giới hạn giống hệt
 * email thật — chống dò email. Tự xoá qua TTL `expireAt`.
 */
const passwordResetSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  otpHash: { type: String },
  otpExpiresAt: { type: Date },
  /** Số lần nhập sai OTP hiện tại — về 0 mỗi khi gửi OTP mới. */
  attempts: { type: Number, default: 0 },
  /** Các mốc đã gửi OTP (chỉ giữ trong cửa sổ 1 giờ) — tính cooldown + giới hạn/giờ. */
  sendHistory: { type: [Date], default: [] },
  resetTokenHash: { type: String },
  resetTokenExpiresAt: { type: Date },
  /** Mốc bị khoá do sai OTP quá số lần. Với email không tồn tại đây là "khoá giả" (không có User để khoá). */
  lockedAt: { type: Date },
  expireAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

passwordResetSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ resetTokenHash: 1 }, { sparse: true });

export type PasswordResetDocument = InferSchemaType<typeof passwordResetSchema>;

export const PasswordReset = models.PasswordReset ?? model("PasswordReset", passwordResetSchema);

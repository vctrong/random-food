import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Bộ đếm rate limit dạng cửa sổ cố định, lưu Mongo để đúng cả khi chạy nhiều
 * instance/serverless (bộ nhớ process không chia sẻ). key ví dụ "pwreset:otp:ip:1.2.3.4".
 */
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expireAt: { type: Date, required: true },
});

rateLimitSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDocument = InferSchemaType<typeof rateLimitSchema>;

export const RateLimit = models.RateLimit ?? model("RateLimit", rateLimitSchema);

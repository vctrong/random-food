import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Type list mở rộng so với docs/database.md mục 8: thêm các loại sự kiện
 * đăng nhập/tài khoản (login_success, login_failed, account_banned,
 * account_unbanned, password_changed) theo yêu cầu bổ sung của Ttong.
 */
const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      "food_approved",
      "food_rejected",
      "food_needs_revision",
      "report_handled",
      "reviewer_application_result",
      "system",
      "login_success",
      "login_failed",
      "account_banned",
      "account_unbanned",
      "password_changed",
    ],
    required: true,
  },
  message: { type: String, required: true },
  relatedId: { type: Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export type NotificationType = NotificationDocument["type"];

export const Notification = models.Notification ?? model("Notification", notificationSchema);

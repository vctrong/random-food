import { Schema, model, models, type InferSchemaType } from "mongoose";
import { NOTIFICATION_RETENTION_DAYS, NOTIFICATION_TYPES } from "@/constants/notifications";

/**
 * Không lưu câu chữ — frontend dựng nội dung từ `type` + `payload`
 * (docs/notifications.md mục 2.1). Chỉ ghi qua lib/notifications/notify.ts.
 */
const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  payload: { type: Schema.Types.Mixed, default: {} },
  link: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, _id: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * NOTIFICATION_RETENTION_DAYS });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

export const Notification = models.Notification ?? model("Notification", notificationSchema);

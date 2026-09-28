import { Schema, model, models, type InferSchemaType } from "mongoose";

/** Chuẩn bị cho push web/mobile — chưa có API/UI dùng tới (docs/notifications.md mục 2.3). */
const deviceTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["web", "android", "ios"], required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
});

deviceTokenSchema.index({ userId: 1 });

export type DeviceTokenDocument = InferSchemaType<typeof deviceTokenSchema>;

export const DeviceToken = models.DeviceToken ?? model("DeviceToken", deviceTokenSchema);

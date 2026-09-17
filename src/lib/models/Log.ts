import { Schema, model, models, type InferSchemaType } from "mongoose";

const logSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// TTL: tự xóa sau 90 ngày — telemetry nội bộ, không phải audit.
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
logSchema.index({ userId: 1, createdAt: -1 });

export type LogDocument = InferSchemaType<typeof logSchema>;

export const Log = models.Log ?? model("Log", logSchema);

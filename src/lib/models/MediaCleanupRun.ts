import { Schema, model, models, type InferSchemaType } from "mongoose";

export const MEDIA_CLEANUP_TRIGGERS = ["manual", "cron", "script"] as const;
export const MEDIA_CLEANUP_STATUSES = ["running", "completed", "partial"] as const;

/**
 * Lịch sử 1 lần dọn ảnh rác trên Cloudinary (docs/database.md). Lần dọn từ trang
 * Admin chạy theo nhiều lô → các lô cộng dồn vào cùng 1 bản ghi (`$inc`).
 * `actorId` trống = chạy tự động (cron) hoặc script dòng lệnh.
 */
const mediaCleanupRunSchema = new Schema({
  trigger: { type: String, enum: MEDIA_CLEANUP_TRIGGERS, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  /** "selected" = Admin chọn từng ảnh; "all" = mọi ảnh rác đủ tuổi. */
  mode: { type: String, enum: ["selected", "all"], required: true },
  days: { type: Number, required: true },
  /** Giới hạn thư mục con của nayangi/ (vd "announcements"); trống = mọi thư mục. */
  folder: { type: String },
  status: { type: String, enum: MEDIA_CLEANUP_STATUSES, default: "running" },
  deletedCount: { type: Number, default: 0 },
  /** Ảnh còn được dùng trong DB → gỡ tag thay vì xoá. */
  retaggedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  bytesFreed: { type: Number, default: 0 },
  /** Vài lỗi đầu tiên để tra cứu (tối đa 20). */
  errorSamples: { type: [String], default: [] },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
});

mediaCleanupRunSchema.index({ startedAt: -1 });

export type MediaCleanupRunDocument = InferSchemaType<typeof mediaCleanupRunSchema>;

export const MediaCleanupRun = models.MediaCleanupRun ?? model("MediaCleanupRun", mediaCleanupRunSchema);

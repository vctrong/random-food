import { Schema, model, models, type InferSchemaType } from "mongoose";
import { ANNOUNCEMENT_TARGET_ROLES, ANNOUNCEMENT_TYPES } from "@/constants/announcements";

/**
 * Thông báo chính thức (docs/notifications.md mục 2.2). `status` chỉ là ý định của
 * Admin (nháp / đăng); "đã lên lịch / đang hiển thị / hết hạn" luôn tính từ
 * publishAt + expireAt lúc truy vấn nên không cần cron.
 */
const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  summary: { type: String, required: true, trim: true },
  highlights: {
    type: [
      new Schema(
        {
          label: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
          note: { type: String, trim: true },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  // TipTap JSON — Mixed vì cấu trúc cây node do TipTap định nghĩa.
  content: { type: Schema.Types.Mixed, required: true },
  type: { type: String, enum: ANNOUNCEMENT_TYPES, required: true },
  targetRoles: { type: [{ type: String, enum: ANNOUNCEMENT_TARGET_ROLES }], default: ["all"] },
  isPinned: { type: Boolean, default: false },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  publishAt: { type: Date },
  expireAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

announcementSchema.index({ status: 1, publishAt: -1 });
announcementSchema.index({ isPinned: -1, publishAt: -1 });

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema>;

export const Announcement = models.Announcement ?? model("Announcement", announcementSchema);

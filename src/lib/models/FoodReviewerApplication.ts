import { Schema, model, models, type InferSchemaType } from "mongoose";

const socialLinkSchema = new Schema(
  {
    platform: { type: String, enum: ["tiktok", "instagram"], required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

/**
 * Các field hồ sơ (fullName → commitmentVersion) để optional ở schema vì đơn cũ
 * (tạo trước khi có form ứng tuyển) không có; việc bắt buộc được kiểm ở tầng
 * API/logic (`applicationLogic.ts`). `reviewNote` là ghi chú duyệt/từ chối của
 * Admin — trước đây tên `reason` (xem scripts/migrateReviewerApplicationReviewNote.mjs).
 */
const foodReviewerApplicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "withdrawn"], default: "pending" },
  fullName: { type: String },
  motivation: { type: String },
  expertiseCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  activeAreas: [{ type: String }],
  socialLinks: [socialLinkSchema],
  portfolioImages: [{ type: String }],
  scenarioAnswer: { type: String },
  agreedAt: { type: Date },
  commitmentVersion: { type: String },
  reviewNote: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

foodReviewerApplicationSchema.index({ userId: 1, status: 1 });
// Mỗi user chỉ có 1 đơn đang chờ duyệt — chặn cả trường hợp 2 request nộp đồng thời.
foodReviewerApplicationSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "userId_pending_unique" },
);

export type FoodReviewerApplicationDocument = InferSchemaType<
  typeof foodReviewerApplicationSchema
>;

export const FoodReviewerApplication =
  models.FoodReviewerApplication ??
  model("FoodReviewerApplication", foodReviewerApplicationSchema);

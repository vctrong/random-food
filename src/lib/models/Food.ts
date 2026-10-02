import { Schema, model, models, type InferSchemaType } from "mongoose";
import { SUBMISSION_STATUSES } from "@/features/contributions/submissionRules";

const foodSchema = new Schema({
  restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  description: { type: String },
  categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  /** Danh mục user đề xuất kèm món (tối đa 1) — gỡ khi đề xuất được xử lý. */
  proposedCategoryId: { type: Schema.Types.ObjectId, ref: "CategoryProposal" },
  eatingLevels: {
    type: [{ type: String, enum: ["snack", "normal", "hearty", "full"] }],
    required: true,
    validate: {
      validator: (value: string[]) => Array.isArray(value) && value.length > 0,
      message: "Food phải có ít nhất 1 eatingLevel",
    },
  },
  images: [{ type: String }],
  priceRange: {
    min: { type: Number },
    max: { type: Number },
  },
  caloriesEstimate: {
    min: { type: Number },
    max: { type: Number },
  },
  tags: [{ type: String }],
  /** pending | in_review | needs_revision | approved | rejected | withdrawn — chuyển trạng thái chỉ qua lib/submissionWorkflow.ts. */
  moderationStatus: { type: String, enum: SUBMISSION_STATUSES, default: "pending" },
  visibility: { type: String, enum: ["visible", "hidden", "deleted"], default: "visible" },
  /** Lý do reject / needs_revision — hiển thị cho user. */
  moderationNote: { type: String },
  /** Reviewer đang giữ đề xuất (`in_review`) và thời điểm nhận — hết hạn thì tự nhả. */
  reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
  claimedAt: { type: Date },
  /** Số lần user tự sửa khi đang `pending` (tối đa MAX_PENDING_EDITS); reset khi gửi lại từ needs_revision. */
  editCount: { type: Number, default: 0 },
  verification: {
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    note: { type: String },
  },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

foodSchema.index({ moderationStatus: 1, visibility: 1, eatingLevels: 1 });
foodSchema.index({ restaurantId: 1 });
foodSchema.index({ moderationStatus: 1, claimedAt: 1 });
foodSchema.index({ reviewerId: 1, moderationStatus: 1 });
foodSchema.index({ categoryIds: 1 });
foodSchema.index({ name: "text", description: "text", tags: "text" });

export type FoodDocument = InferSchemaType<typeof foodSchema>;

export const Food = models.Food ?? model("Food", foodSchema);

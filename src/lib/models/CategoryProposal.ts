import { Schema, model, models, type InferSchemaType } from "mongoose";
import { normalizeVietnamese } from "@/lib/vietnameseText";

/**
 * Đề xuất danh mục mới. Nhiều user đề xuất cùng tên (sau chuẩn hoá) được gộp
 * vào 1 bản ghi `pending` (unique một phần theo `nameNormalized`).
 * - `merged`: FoodReviewer/Admin gộp vào danh mục có sẵn (`mergedIntoCategoryId`).
 * - `approved`: CHỈ Admin tạo danh mục mới từ đề xuất (`createdCategoryId`).
 */
const categoryProposalSchema = new Schema({
  name: { type: String, required: true },
  nameNormalized: { type: String },
  /** Người đề xuất đầu tiên (giữ nguyên field cũ). */
  proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  proposerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  proposalCount: { type: Number, default: 1 },
  foodIds: [{ type: Schema.Types.ObjectId, ref: "Food" }],
  status: { type: String, enum: ["pending", "approved", "rejected", "merged"], default: "pending" },
  mergedIntoCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
  createdCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

categoryProposalSchema.pre("validate", function () {
  this.nameNormalized = normalizeVietnamese(this.name ?? "");
});

categoryProposalSchema.index(
  { nameNormalized: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "nameNormalized_pending_unique" },
);
categoryProposalSchema.index({ status: 1, createdAt: -1 });

export type CategoryProposalDocument = InferSchemaType<typeof categoryProposalSchema>;

export const CategoryProposal =
  models.CategoryProposal ?? model("CategoryProposal", categoryProposalSchema);

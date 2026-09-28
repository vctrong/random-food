import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Case = gom mọi báo cáo của 1 đối tượng (targetType + targetId). Mỗi đối tượng
 * tối đa 1 case `pending`; case đã đóng mà có báo cáo mới thì mở case mới.
 */
const reportCaseSchema = new Schema({
  targetType: { type: String, enum: ["food", "review", "restaurant"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reportCount: { type: Number, default: 0 },
  /** Số lượt theo từng lý do, vd { spam: 2, other: 1 }. */
  reasonCounts: { type: Map, of: Number, default: {} },
  status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending" },
  action: {
    type: String,
    enum: ["dismiss", "remove_review", "remove_review_warn", "edit_info", "mark_closed", "merge_restaurant"],
  },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  resolutionNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reportCaseSchema.index(
  { targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "target_pending_unique" },
);
reportCaseSchema.index({ status: 1, reportCount: -1, updatedAt: -1 });

export type ReportCaseDocument = InferSchemaType<typeof reportCaseSchema>;

export const ReportCase = models.ReportCase ?? model("ReportCase", reportCaseSchema);

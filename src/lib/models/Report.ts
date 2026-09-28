import { Schema, model, models, type InferSchemaType } from "mongoose";
import { REPORT_REASON_IDS } from "@/constants/reports";

/**
 * 1 lượt báo cáo của 1 user cho 1 đối tượng. Trạng thái xử lý nằm ở ReportCase
 * (gom các report cùng đối tượng) — xem docs/report-flow.md.
 */
const reportSchema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["food", "review", "restaurant"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: REPORT_REASON_IDS, required: true },
  note: { type: String, maxlength: 300 },
  /** Chỉ khi reason = "duplicate": quán gốc mà quán bị báo cáo trùng với. */
  duplicateOfRestaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
  caseId: { type: Schema.Types.ObjectId, ref: "ReportCase", required: true },
  createdAt: { type: Date, default: Date.now },
});

// BR-M07: mỗi user chỉ báo cáo 1 lần cho mỗi đối tượng.
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true, name: "reporter_target_unique" });
reportSchema.index({ caseId: 1, createdAt: -1 });

export type ReportDocument = InferSchemaType<typeof reportSchema>;

export const Report = models.Report ?? model("Report", reportSchema);

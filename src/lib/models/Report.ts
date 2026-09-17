import { Schema, model, models, type InferSchemaType } from "mongoose";

const reportSchema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["food", "review", "restaurant"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "reviewed"], default: "pending" },
  action: {
    type: String,
    enum: ["keep", "hide", "remove", "warn_user", "ban_user"],
    default: null,
  },
  handledBy: { type: Schema.Types.ObjectId, ref: "User" },
  handledAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export type ReportDocument = InferSchemaType<typeof reportSchema>;

export const Report = models.Report ?? model("Report", reportSchema);

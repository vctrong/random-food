import { Schema, model, models, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: [
      "approve_food",
      "reject_food",
      "needs_revision",
      "ban_user",
      "unban_user",
      "hide_review",
      "delete_food",
      "assign_reviewer",
      "remove_reviewer",
      "change_user_role",
      "set_visibility",
      "approve_reviewer_application",
      "reject_reviewer_application",
      "category_create",
      "category_update",
      "category_delete",
      "handle_report",
    ],
    required: true,
  },
  targetType: {
    type: String,
    enum: ["food", "restaurant", "review", "user", "category", "report"],
    required: true,
  },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;

export const AuditLog = models.AuditLog ?? model("AuditLog", auditLogSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema({
  // Không bắt buộc: việc tự động (cron dọn ảnh) không có người thực hiện — UI hiện "Tự động".
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  action: {
    type: String,
    enum: [
      "approve_food",
      "reject_food",
      "needs_revision",
      "claim_submission",
      "release_submission",
      "withdraw_submission",
      "admin_override_decision",
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
      "category_proposal_merge",
      "category_proposal_reject",
      "category_proposal_approve",
      "report_case_resolve",
      "report_case_dismiss",
      "restaurant_close",
      "restaurant_reopen",
      "restaurant_merge",
      "content_edit",
      "handle_report",
      "announcement_create",
      "announcement_update",
      "announcement_publish",
      "announcement_delete",
      "media_cleanup",
    ],
    required: true,
  },
  targetType: {
    type: String,
    enum: ["food", "restaurant", "review", "user", "category", "report", "announcement", "media"],
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

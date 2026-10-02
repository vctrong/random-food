import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Ghi chú đính chính user gửi cho reviewer khi đề xuất đang `in_review` (không sửa trực
 * tiếp được). `submissionId` là _id của Food — mỗi đề xuất là 1 món (docs/database.md).
 */
const submissionNoteSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

submissionNoteSchema.index({ submissionId: 1, createdAt: 1 });

export type SubmissionNoteDocument = InferSchemaType<typeof submissionNoteSchema>;

export const SubmissionNote = models.SubmissionNote ?? model("SubmissionNote", submissionNoteSchema);

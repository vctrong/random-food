import { Schema, model, models, type InferSchemaType } from "mongoose";

const categoryProposalSchema = new Schema({
  name: { type: String, required: true },
  proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export type CategoryProposalDocument = InferSchemaType<typeof categoryProposalSchema>;

export const CategoryProposal =
  models.CategoryProposal ?? model("CategoryProposal", categoryProposalSchema);

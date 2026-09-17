import { Schema, model, models, type InferSchemaType } from "mongoose";

const foodReviewerApplicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reason: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

foodReviewerApplicationSchema.index({ userId: 1, status: 1 });

export type FoodReviewerApplicationDocument = InferSchemaType<
  typeof foodReviewerApplicationSchema
>;

export const FoodReviewerApplication =
  models.FoodReviewerApplication ??
  model("FoodReviewerApplication", foodReviewerApplicationSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  experienceId: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Xoá mềm khi user xoá review đã quá 24h — giữ lại bản ghi để unique index chặn viết lại (BR-RV11).
  deletedAt: { type: Date },
});

reviewSchema.index({ userId: 1, foodId: 1, restaurantId: 1 }, { unique: true });
reviewSchema.index({ foodId: 1, status: 1 });

export type ReviewDocument = InferSchemaType<typeof reviewSchema>;

export const Review = models.Review ?? model("Review", reviewSchema);

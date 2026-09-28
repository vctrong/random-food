import { Schema, model, models, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  experienceId: { type: Schema.Types.ObjectId, ref: "Experience", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  // "hidden_pending_review": tự ẩn tạm khi ≥ 3 user khác nhau báo cáo, chờ Admin xử lý (BR-M09).
  // Chỉ "visible" mới hiện công khai và được tính vào avgRating/ratingCount.
  status: { type: String, enum: ["visible", "hidden", "hidden_pending_review"], default: "visible" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Xoá mềm khi user xoá review đã quá 24h — giữ lại bản ghi để unique index chặn viết lại (BR-RV11).
  deletedAt: { type: Date },
});

reviewSchema.index({ userId: 1, foodId: 1, restaurantId: 1 }, { unique: true });
reviewSchema.index({ foodId: 1, status: 1 });

export type ReviewDocument = InferSchemaType<typeof reviewSchema>;

export const Review = models.Review ?? model("Review", reviewSchema);

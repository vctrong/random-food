import { Schema, model, models, type InferSchemaType } from "mongoose";

const foodSchema = new Schema({
  restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  description: { type: String },
  categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  eatingLevels: {
    type: [{ type: String, enum: ["snack", "normal", "hearty", "full"] }],
    required: true,
    validate: {
      validator: (value: string[]) => Array.isArray(value) && value.length > 0,
      message: "Food phải có ít nhất 1 eatingLevel",
    },
  },
  images: [{ type: String }],
  priceRange: {
    min: { type: Number },
    max: { type: Number },
  },
  caloriesEstimate: {
    min: { type: Number },
    max: { type: Number },
  },
  tags: [{ type: String }],
  moderationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "needs_revision"],
    default: "pending",
  },
  visibility: { type: String, enum: ["visible", "hidden", "deleted"], default: "visible" },
  moderationNote: { type: String },
  verification: {
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    note: { type: String },
  },
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

foodSchema.index({ moderationStatus: 1, visibility: 1, eatingLevels: 1 });
foodSchema.index({ restaurantId: 1 });
foodSchema.index({ categoryIds: 1 });
foodSchema.index({ name: "text", description: "text", tags: "text" });

export type FoodDocument = InferSchemaType<typeof foodSchema>;

export const Food = models.Food ?? model("Food", foodSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  icon: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export const Category = models.Category ?? model("Category", categorySchema);

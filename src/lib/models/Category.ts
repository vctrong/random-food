import { Schema, model, models, type InferSchemaType } from "mongoose";
import { CATEGORY_GROUP_IDS } from "@/constants/categoryGroups";
import { normalizeVietnamese } from "@/lib/vietnameseText";

const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  icon: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  /** Nhóm cha để gom trong bảng "Xem tất cả" — src/constants/categoryGroups.ts. */
  group: { type: String, enum: CATEGORY_GROUP_IDS, default: "khac" },
  /** `name` không dấu, lowercase — tìm kiếm/so khớp. Tự cập nhật khi save. */
  nameNormalized: { type: String },
  /** Số món approved + visible — denormalized, cập nhật qua lib/categoryCounts.ts. */
  foodCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

categorySchema.pre("validate", function () {
  this.nameNormalized = normalizeVietnamese(this.name ?? "");
});

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export const Category = models.Category ?? model("Category", categorySchema);

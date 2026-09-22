import { Schema, model, models, type InferSchemaType } from "mongoose";

const userProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  preferences: {
    favoriteCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    // max để trống = không giới hạn trên (khớp preset "Tất cả mức giá" cũ).
    priceRange: {
      min: { type: Number },
      max: { type: Number },
    },
    // Chuyển từ localStorage "Tuỳ chọn Random" cũ sang DB — xem randomLogic.ts
    // (applyPersonalPreferences) để biết cách các field này lọc random thật.
    favoriteFoodNames: [{ type: String }],
    dislikedIngredients: [{ type: String }],
    spicePreference: {
      type: String,
      enum: ["khong-cay", "cay-nhe", "cay-vua", "sieu-cay"],
    },
    vegetarianMode: { type: Boolean, default: false },
    allowRepeatWithin24h: { type: Boolean, default: true },
  },
  // "light" | "dark" | "system" — nguồn phụ để đồng bộ theme giữa các thiết bị;
  // cookie/localStorage (next-themes) vẫn là nguồn nhanh chống nháy sáng lúc tải trang.
  theme: { type: String, enum: ["light", "dark", "system"] },
  notificationPrefs: {
    food_approved: { type: Boolean, default: true },
    food_rejected: { type: Boolean, default: true },
    food_needs_revision: { type: Boolean, default: true },
    report_handled: { type: Boolean, default: true },
    reviewer_application_result: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
    login_success: { type: Boolean, default: false },
    login_failed: { type: Boolean, default: true },
    account_banned: { type: Boolean, default: true },
    account_unbanned: { type: Boolean, default: true },
    password_changed: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export type UserProfileDocument = InferSchemaType<typeof userProfileSchema>;

export const UserProfile = models.UserProfile ?? model("UserProfile", userProfileSchema);

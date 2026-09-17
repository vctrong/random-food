import { Schema, model, models, type InferSchemaType } from "mongoose";

const userProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  preferences: {
    favoriteCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    priceRange: {
      min: { type: Number },
      max: { type: Number },
    },
  },
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

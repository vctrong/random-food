import { Schema, model, models, type InferSchemaType } from "mongoose";

const userAchievementSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // Khớp AchievementId trong constants/contribution.ts — điều kiện mở khoá nằm ở code, không lưu DB.
  achievementId: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
});

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export type UserAchievementDocument = InferSchemaType<typeof userAchievementSchema>;

export const UserAchievement = models.UserAchievement ?? model("UserAchievement", userAchievementSchema);

import { Schema, model, models, type InferSchemaType } from "mongoose";

const favoriteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
  createdAt: { type: Date, default: Date.now },
});

favoriteSchema.index({ userId: 1, foodId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

export type FavoriteDocument = InferSchemaType<typeof favoriteSchema>;

export const Favorite = models.Favorite ?? model("Favorite", favoriteSchema);

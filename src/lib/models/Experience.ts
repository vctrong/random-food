import { Schema, model, models, type InferSchemaType } from "mongoose";

const experienceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  foodId: { type: Schema.Types.ObjectId, ref: "Food" },
  createdAt: { type: Date, default: Date.now },
});

experienceSchema.index({ userId: 1, restaurantId: 1, createdAt: -1 });

export type ExperienceDocument = InferSchemaType<typeof experienceSchema>;

export const Experience = models.Experience ?? model("Experience", experienceSchema);

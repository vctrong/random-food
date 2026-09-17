import { Schema, model, models, type InferSchemaType } from "mongoose";

const restaurantSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  openingHours: { type: String },
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
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

restaurantSchema.index({ location: "2dsphere" });
restaurantSchema.index({ moderationStatus: 1, visibility: 1 });

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema>;

export const Restaurant = models.Restaurant ?? model("Restaurant", restaurantSchema);

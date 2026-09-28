import { Schema, model, models, type InferSchemaType } from "mongoose";
import { normalizeVietnamese } from "@/lib/vietnameseText";

export const LOCATION_SOURCES = ["gps", "pin_confirmed", "geocoded", "none"] as const;

/**
 * Toạ độ KHÔNG bắt buộc (CLAUDE.md 7.3): quán chưa có vị trí thì không có field
 * `location` (subdocument `default: undefined`) — không được để lại
 * `{ type: "Point" }` thiếu coordinates vì index 2dsphere sẽ báo lỗi.
 */
const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

const restaurantSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: { type: pointSchema, default: undefined },
  /** Độ tin cậy của `location`: gps | pin_confirmed | geocoded | none. */
  locationSource: { type: String, enum: LOCATION_SOURCES },
  /** Ảnh quán (Cloudinary) — rỗng nếu không có; KHÔNG lưu URL ảnh mặc định. */
  images: { type: [String], default: [] },
  nameNormalized: { type: String },
  addressNormalized: { type: String },
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

restaurantSchema.pre("validate", function () {
  this.nameNormalized = normalizeVietnamese(this.name ?? "");
  this.addressNormalized = normalizeVietnamese(this.address ?? "");
});

restaurantSchema.index({ location: "2dsphere" });
restaurantSchema.index({ moderationStatus: 1, visibility: 1 });
// Danh sách chọn quán khi không có vị trí: mới thêm gần đây, phân trang theo _id.
restaurantSchema.index({ moderationStatus: 1, visibility: 1, _id: -1 });

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema>;

export const Restaurant = models.Restaurant ?? model("Restaurant", restaurantSchema);

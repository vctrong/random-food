/**
 * Migration cho luồng "Nhận xác minh" đề xuất món (docs/contribute-food.md mục 8):
 *  1. foods: gán `editCount: 0` cho món chưa có field — điều kiện `editCount < 3` của
 *     update có điều kiện KHÔNG khớp field thiếu, nên bước này bắt buộc.
 *  2. Index: foods `{ moderationStatus, claimedAt }`, `{ reviewerId, moderationStatus }`;
 *     submissionnotes `{ submissionId, createdAt }`.
 *  3. Chỉ báo cáo (không ghi): quán `pending` bị > 1 món tham chiếu.
 *
 * Không đổi giá trị trạng thái nào (giữ chữ thường, `pending` cũ vẫn là `pending`).
 * Idempotent. Mặc định DRY-RUN. Chạy thật: npm run migrate:submission-review -- --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const foods = db.collection("foods");
  const notes = db.collection("submissionnotes");

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"} · DB: ${db.databaseName}\n`);

  const statusRows = await foods.aggregate([{ $group: { _id: "$moderationStatus", count: { $sum: 1 } } }]).toArray();
  console.log(`Món theo trạng thái: ${statusRows.map((row) => `${row._id}=${row.count}`).join(", ") || "(trống)"}`);

  const missingEditCount = await foods.countDocuments({ editCount: { $exists: false } });
  console.log(`1) Món chưa có editCount: ${missingEditCount} → gán 0`);
  if (APPLY && missingEditCount > 0) {
    await foods.updateMany({ editCount: { $exists: false } }, { $set: { editCount: 0 } });
  }

  console.log("2) Index foods {moderationStatus, claimedAt}, {reviewerId, moderationStatus}; submissionnotes {submissionId, createdAt}");
  if (APPLY) {
    await foods.createIndex({ moderationStatus: 1, claimedAt: 1 });
    await foods.createIndex({ reviewerId: 1, moderationStatus: 1 });
    await notes.createIndex({ submissionId: 1, createdAt: 1 });
  }

  const shared = await foods
    .aggregate([
      { $lookup: { from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "restaurant" } },
      { $unwind: "$restaurant" },
      { $match: { "restaurant.moderationStatus": "pending", visibility: { $ne: "deleted" } } },
      { $group: { _id: "$restaurantId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  console.log(`3) Quán pending bị > 1 món tham chiếu: ${shared.length}${shared.length ? ` (${shared.map((row) => row._id).join(", ")})` : ""}`);

  console.log(APPLY ? "\n✓ Hoàn tất." : "\nThêm --apply để chạy thật.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

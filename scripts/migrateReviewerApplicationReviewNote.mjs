/**
 * Migration cho collection `foodreviewerapplications`:
 *  1. Đổi tên field `reason` → `reviewNote` (ghi chú duyệt/từ chối của Admin).
 *  2. Báo cáo user có nhiều hơn 1 đơn `pending` — sẽ làm unique index một phần
 *     `userId_pending_unique` (thêm trong model FoodReviewerApplication) không tạo được.
 *
 * Mặc định chỉ DRY-RUN (in số bản ghi sẽ bị ảnh hưởng, không ghi gì).
 * Chạy thật: node --env-file=.env.local scripts/migrateReviewerApplicationReviewNote.mjs --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("foodreviewerapplications");

  const toRename = await collection.countDocuments({ reason: { $exists: true }, reviewNote: { $exists: false } });
  const alreadyHasNote = await collection.countDocuments({ reason: { $exists: true }, reviewNote: { $exists: true } });

  const duplicatePending = await collection
    .aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}`);
  console.log(`- Đơn cần đổi reason → reviewNote: ${toRename}`);
  console.log(`- Đơn có cả reason lẫn reviewNote (chỉ xoá reason cũ): ${alreadyHasNote}`);
  console.log(`- User có >1 đơn pending (cần xử lý tay trước khi tạo unique index): ${duplicatePending.length}`);

  if (duplicatePending.length > 0) {
    console.error("Dừng: còn user có nhiều đơn pending, xử lý trước rồi chạy lại.");
    process.exitCode = 1;
  } else if (APPLY) {
    const renamed = await collection.updateMany(
      { reason: { $exists: true }, reviewNote: { $exists: false } },
      { $rename: { reason: "reviewNote" } },
    );
    const cleaned = await collection.updateMany({ reason: { $exists: true } }, { $unset: { reason: "" } });
    console.log(`✓ Đã đổi tên ${renamed.modifiedCount} bản ghi, dọn reason cũ ${cleaned.modifiedCount} bản ghi.`);
  } else {
    console.log("Thêm --apply để chạy thật.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

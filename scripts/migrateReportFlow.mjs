/**
 * Migration cho luồng báo cáo (docs/report-flow.md):
 *  1. restaurants: gán `businessStatus: "open"` cho quán cũ chưa có field (truy vấn đã dùng `$ne: "closed"`
 *     nên thiếu field vẫn chạy đúng — bước này chỉ để dữ liệu nhất quán).
 *  2. reports: collection đã đổi cấu trúc (bỏ status/action/handledBy, thêm reason enum/note/caseId).
 *     Dừng nếu còn báo cáo dạng cũ. Tạo unique index `reporter_target_unique`, xoá index cũ `status_1_createdAt_-1`.
 *  3. reportcases: tạo index `target_pending_unique` (unique một phần) + index sắp xếp danh sách.
 *
 * Idempotent. Mặc định DRY-RUN. Chạy thật: npm run migrate:report-flow -- --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const restaurants = db.collection("restaurants");
  const reports = db.collection("reports");
  const reportCases = db.collection("reportcases");

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}\n`);

  const legacyReports = await reports.countDocuments({ caseId: { $exists: false } });
  if (legacyReports > 0) {
    console.error(`Dừng: còn ${legacyReports} báo cáo dạng cũ (không có caseId) — cần xử lý tay trước.`);
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const missingStatus = await restaurants.countDocuments({ businessStatus: { $exists: false } });
  console.log(`1) Quán chưa có businessStatus: ${missingStatus} → gán "open"`);
  if (APPLY && missingStatus > 0) {
    await restaurants.updateMany({ businessStatus: { $exists: false } }, { $set: { businessStatus: "open" } });
  }

  const reportIndexes = (await reports.indexes().catch(() => [])).map((index) => index.name);
  console.log(`2) Index reports hiện có: ${reportIndexes.join(", ") || "(chưa có collection)"}`);
  if (APPLY) {
    if (reportIndexes.includes("status_1_createdAt_-1")) await reports.dropIndex("status_1_createdAt_-1");
    await reports.createIndex({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true, name: "reporter_target_unique" });
    await reports.createIndex({ caseId: 1, createdAt: -1 });
  }

  console.log("3) Index reportcases: target_pending_unique, {status, reportCount, updatedAt}");
  if (APPLY) {
    await reportCases.createIndex(
      { targetType: 1, targetId: 1 },
      { unique: true, partialFilterExpression: { status: "pending" }, name: "target_pending_unique" },
    );
    await reportCases.createIndex({ status: 1, reportCount: -1, updatedAt: -1 });
  }

  console.log(APPLY ? "\n✓ Hoàn tất." : "\nThêm --apply để chạy thật.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

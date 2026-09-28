/**
 * Chuyển sang hệ thống thông báo mới (docs/notifications.md) — đã chốt: KHÔNG migrate dữ liệu cũ.
 *  1. notifications: xoá TOÀN BỘ bản ghi cũ (dạng userId + message), xoá index cũ theo `userId`,
 *     tạo index mới + TTL 90 ngày.
 *  2. userprofiles: bỏ field `notificationPrefs` cũ (thay bằng `notificationPreferences`, dùng giá trị mặc định mới).
 *  3. announcements, devicetokens: tạo index.
 *
 * Idempotent. Mặc định DRY-RUN. Chạy thật: npm run reset:notifications -- --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const RETENTION_SECONDS = 60 * 60 * 24 * 90;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const notifications = db.collection("notifications");
  const profiles = db.collection("userprofiles");

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}\n`);

  const total = await notifications.countDocuments();
  const indexes = await notifications.indexes().catch(() => []);
  // Index cũ dựa trên field userId (đã đổi thành recipientId) — xoá theo key, không phụ thuộc tên.
  const legacyIndexes = indexes.filter((index) => "userId" in index.key).map((index) => index.name);
  console.log(`1) notifications: ${total} bản ghi sẽ bị xoá. Index cũ sẽ xoá: ${legacyIndexes.join(", ") || "(không có)"}`);
  if (APPLY) {
    await notifications.deleteMany({});
    for (const name of legacyIndexes) await notifications.dropIndex(name);
    await notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 });
    await notifications.createIndex({ recipientId: 1, _id: -1 });
    await notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
  }

  const withOldPrefs = await profiles.countDocuments({ notificationPrefs: { $exists: true } });
  console.log(`2) userprofiles còn notificationPrefs cũ: ${withOldPrefs} → $unset`);
  if (APPLY && withOldPrefs > 0) {
    await profiles.updateMany({ notificationPrefs: { $exists: true } }, { $unset: { notificationPrefs: "" } });
  }

  console.log("3) Index announcements (slug unique, status+publishAt, isPinned+publishAt), devicetokens (token unique, userId)");
  if (APPLY) {
    const announcements = db.collection("announcements");
    await announcements.createIndex({ slug: 1 }, { unique: true });
    await announcements.createIndex({ status: 1, publishAt: -1 });
    await announcements.createIndex({ isPinned: -1, publishAt: -1 });
    const deviceTokens = db.collection("devicetokens");
    await deviceTokens.createIndex({ token: 1 }, { unique: true });
    await deviceTokens.createIndex({ userId: 1 });
  }

  console.log(APPLY ? "\nXong." : "\nDry-run xong. Thêm --apply để chạy thật.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await mongoose.disconnect();
});

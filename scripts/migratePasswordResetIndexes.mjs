/**
 * Migration cho luồng Quên mật khẩu (docs/forgot-password.md) — CHỈ THÊM, không sửa dữ liệu cũ:
 *  1. `passwordresets`: unique { email }, TTL { expireAt }, sparse { resetTokenHash }.
 *  2. `ratelimits`: unique { key }, TTL { expireAt }.
 *  2b. `emailverifications` (xác thực email trong Hồ sơ): unique { userId }, TTL { expireAt }.
 *  3. `users`: sparse { "securityLock.unlockTokenHash" } — field `securityLock` là optional,
 *     user cũ không có field này = không bị khoá, nên không cần backfill.
 *
 * Mongoose cũng tự tạo các index này khi app kết nối (autoIndex), script này để
 * tạo chủ động trên production / kiểm tra trước. Idempotent — chạy lại không sao.
 * Mặc định DRY-RUN. Chạy thật: node --env-file=.env.local scripts/migratePasswordResetIndexes.mjs --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

const INDEXES = [
  { collection: "passwordresets", key: { email: 1 }, options: { unique: true, name: "email_1" } },
  { collection: "passwordresets", key: { expireAt: 1 }, options: { expireAfterSeconds: 0, name: "expireAt_1" } },
  { collection: "passwordresets", key: { resetTokenHash: 1 }, options: { sparse: true, name: "resetTokenHash_1" } },
  { collection: "ratelimits", key: { key: 1 }, options: { unique: true, name: "key_1" } },
  { collection: "ratelimits", key: { expireAt: 1 }, options: { expireAfterSeconds: 0, name: "expireAt_1" } },
  { collection: "emailverifications", key: { userId: 1 }, options: { unique: true, name: "userId_1" } },
  { collection: "emailverifications", key: { expireAt: 1 }, options: { expireAfterSeconds: 0, name: "expireAt_1" } },
  {
    collection: "users",
    key: { "securityLock.unlockTokenHash": 1 },
    options: { sparse: true, name: "securityLock.unlockTokenHash_1" },
  },
];

async function existingIndexNames(db, collection) {
  const exists = await db.listCollections({ name: collection }).hasNext();
  if (!exists) return new Set();
  return new Set((await db.collection(collection).indexes()).map((index) => index.name));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}`);

  for (const { collection, key, options } of INDEXES) {
    const names = await existingIndexNames(db, collection);
    if (names.has(options.name)) {
      console.log(`- ${collection}.${options.name}: đã có, bỏ qua`);
      continue;
    }
    if (APPLY) {
      await db.collection(collection).createIndex(key, options);
      console.log(`✓ ${collection}.${options.name}: đã tạo`);
    } else {
      console.log(`- ${collection}.${options.name}: sẽ tạo`);
    }
  }

  const lockedUsers = await db.collection("users").countDocuments({ "securityLock.lockedAt": { $exists: true } });
  console.log(`- User đang bị tạm khoá (securityLock): ${lockedUsers}`);
  const unverifiedLocal = await db
    .collection("users")
    .countDocuments({ passwordHash: { $exists: true, $ne: null }, isVerified: { $ne: true } });
  console.log(`- User có mật khẩu nhưng CHƯA xác thực email (chưa dùng được Quên mật khẩu): ${unverifiedLocal}`);
  if (!APPLY) console.log("Thêm --apply để chạy thật.");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Backfill `users.authProvider = "google"` cho tài khoản Google tạo trước khi
 * events.createUser (src/lib/auth.ts) bắt đầu ghi field này — docs/database.md mục 1.
 * Thiếu field thì Mongoose đọc ra mặc định "local", nên trang Admin hiển thị sai.
 *
 * Chỉ áp dụng cho user có bản ghi `accounts { provider: "google" }` (collection của
 * NextAuth — chỉ đọc) và: THIẾU field, HOẶC đang là "local" mà KHÔNG có mật khẩu
 * (Mongoose ghi giá trị mặc định "local" khi document được save — không có mật khẩu
 * thì không thể là tài khoản tạo bằng email/mật khẩu). Không ghi đè "local" có mật khẩu.
 * KHÔNG đụng tới isVerified / passwordHash (đã chốt: tài khoản Google cũ giữ nguyên
 * isVerified). Idempotent — chạy lại không sao.
 * Mặc định DRY-RUN. Chạy thật: node --env-file=.env.local scripts/backfillGoogleAuthProvider.mjs --apply
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

function maskEmail(email) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"}`);

  const googleUserIds = await db.collection("accounts").distinct("userId", { provider: "google" });
  const noPassword = { $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }, { passwordHash: "" }] };
  const filter = {
    _id: { $in: googleUserIds },
    $or: [{ authProvider: { $exists: false } }, { $and: [{ authProvider: "local" }, noPassword] }],
  };
  const targets = await db
    .collection("users")
    .find(filter, { projection: { email: 1, passwordHash: 1, isVerified: 1, authProvider: 1 } })
    .toArray();

  console.log(`- User có liên kết Google: ${googleUserIds.length}`);
  console.log(`- Thiếu authProvider / "local" mà không có mật khẩu (sẽ đặt "google"): ${targets.length}`);
  for (const user of targets) {
    console.log(
      `    ${user._id} ${maskEmail(user.email ?? "")} · authProvider hiện tại: ${user.authProvider ?? "(thiếu)"} · có mật khẩu: ${Boolean(user.passwordHash)} · isVerified: ${user.isVerified === true}`,
    );
  }

  if (APPLY && targets.length > 0) {
    const result = await db.collection("users").updateMany(filter, { $set: { authProvider: "google" } });
    console.log(`✓ Đã cập nhật ${result.modifiedCount} user.`);
  } else if (!APPLY) {
    console.log("Thêm --apply để chạy thật.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

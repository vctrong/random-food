/**
 * Tạo (hoặc cập nhật) 1 tài khoản admin cho hệ thống. Idempotent — chạy lại
 * nhiều lần chỉ upsert theo email, không tạo trùng. Viết bằng plain JS (không
 * cần ts-node/tsx, tránh thêm dependency mới), theo đúng schema User đã chốt.
 *
 * Chạy: node --env-file=.env.local scripts/seedAdmin.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin@123456789";
const ADMIN_NAME = "Quản trị viên";

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  phone: { type: String },
  role: { type: String, enum: ["user", "foodreviewer", "admin"], default: "user" },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  googleId: { type: String },
  accountStatus: { type: String, enum: ["active", "banned"], default: "active" },
  warningCount: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  sessionVersion: { type: Number, default: 0 },
  lastActiveAt: { type: Date },
});

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu biến môi trường MONGODB_URI");
  }
  if (!PASSWORD_POLICY_REGEX.test(ADMIN_PASSWORD)) {
    throw new Error("Mật khẩu admin không đạt chính sách (8+ ký tự, có chữ, số, ký tự đặc biệt).");
  }

  await mongoose.connect(uri);
  const User = mongoose.models.User ?? mongoose.model("User", userSchema);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await User.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "admin",
        authProvider: "local",
        accountStatus: "active",
        isVerified: true,
      },
      $setOnInsert: { createdAt: new Date(), sessionVersion: 0, warningCount: 0 },
    },
    { upsert: true },
  );

  console.log(`✓ Tài khoản admin sẵn sàng: ${ADMIN_EMAIL}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

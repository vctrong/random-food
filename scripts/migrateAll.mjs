/**
 * Chạy LẦN LƯỢT mọi migration theo đúng thứ tự, cùng tham số (mặc định dry-run, `-- --apply` để ghi thật).
 * Script nào lỗi thì dừng luôn, không chạy các script sau.
 *
 *   npm run migrate:all              # dry-run tất cả
 *   npm run migrate:all -- --apply   # chạy thật tất cả
 *
 * Biến môi trường đã nạp từ --env-file ở lệnh npm và được truyền nguyên cho từng script con.
 * Không in biến môi trường / connection string; mỗi script tự chỉ in tên DB.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Thêm migration mới vào CUỐI danh sách.
const MIGRATIONS = ["migrateSubmissionReview.mjs", "migrateOpeningSchedule.mjs"];

const args = process.argv.slice(2);
for (const [index, file] of MIGRATIONS.entries()) {
  console.log(`\n===== [${index + 1}/${MIGRATIONS.length}] ${file} =====`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(file, import.meta.url)), ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\nDừng: ${file} kết thúc với mã ${result.status ?? "không xác định"} — các migration sau chưa chạy.`);
    process.exit(result.status ?? 1);
  }
}
console.log("\n===== Xong tất cả migration =====");

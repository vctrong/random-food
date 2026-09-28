/**
 * Dọn ảnh rác trên Cloudinary (docs/database.md — mục dọn ảnh). Dùng chung logic với
 * trang /admin/don-anh và cron: src/lib/media/cleanupService.ts.
 *
 *   npm run cleanup:images                       # DRY-RUN: chỉ liệt kê, không xoá
 *   npm run cleanup:images -- --apply            # xoá thật
 *   npm run cleanup:images -- --days=7           # ảnh rác quá 7 ngày (mặc định 3)
 *   npm run cleanup:images -- --folder=foods     # chỉ nayangi/foods
 *
 * Chạy bằng tsx để dùng chung code TypeScript + alias `@/` của app.
 */
import { listOrphanImages, runCleanupJob } from "@/lib/media/cleanupService";
import { DEFAULT_ORPHAN_DAYS, isValidFolderName, MEDIA_ROOT_FOLDER } from "@/lib/media/cleanupRules";

/** Script chạy tay không bị giới hạn như serverless — vẫn đặt hạn chót để không treo vô hạn. */
const SCRIPT_DEADLINE_MS = 30 * 60 * 1000;

function parseArgs(argv: string[]) {
  let apply = false;
  let days = DEFAULT_ORPHAN_DAYS;
  let folder: string | null = null;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg.startsWith("--days=")) {
      const value = Number(arg.slice("--days=".length));
      if (!Number.isInteger(value) || value < 0) throw new Error(`--days phải là số nguyên ≥ 0 (nhận: ${arg})`);
      days = value;
    } else if (arg.startsWith("--folder=")) {
      const value = arg.slice("--folder=".length).replace(new RegExp(`^${MEDIA_ROOT_FOLDER}/`), "").replace(/\/+$/, "");
      if (!isValidFolderName(value)) throw new Error(`--folder không hợp lệ: ${arg} (vd --folder=announcements)`);
      folder = value;
    } else {
      throw new Error(`Tham số lạ: ${arg}`);
    }
  }
  return { apply, days, folder };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const { apply, days, folder } = parseArgs(process.argv.slice(2));
  const scope = folder ? `${MEDIA_ROOT_FOLDER}/${folder}/` : `${MEDIA_ROOT_FOLDER}/*`;
  console.log(`Dọn ảnh rác — phạm vi: ${scope} · quá ${days} ngày · chế độ: ${apply ? "XOÁ THẬT (--apply)" : "DRY-RUN (chỉ liệt kê)"}`);
  if (days === 0) console.warn("⚠ --days=0: cả ảnh Admin/người dùng VỪA tải lên mà chưa lưu form cũng bị tính là rác.");

  if (!apply) {
    const { images, truncated } = await listOrphanImages({ days, folder });
    const byFolder = new Map<string, { count: number; bytes: number }>();
    for (const image of images) {
      const entry = byFolder.get(image.folder) ?? { count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += image.bytes;
      byFolder.set(image.folder, entry);
      console.log(`  - ${image.publicId}  ${formatBytes(image.bytes)}  bỏ từ ${image.referenceAt.slice(0, 10)}`);
    }
    const totalBytes = images.reduce((sum, image) => sum + image.bytes, 0);
    console.log(`\nTổng: ${images.length} ảnh rác · ${formatBytes(totalBytes)}${truncated ? " (còn nữa — quá giới hạn quét)" : ""}`);
    for (const [name, entry] of byFolder) console.log(`  ${name}: ${entry.count} ảnh · ${formatBytes(entry.bytes)}`);
    console.log("\nChưa xoá gì. Thêm --apply để xoá thật (ảnh còn dùng trong DB sẽ được gỡ tag thay vì xoá).");
    return;
  }

  const outcome = await runCleanupJob({ trigger: "script", days, folder, deadlineAt: Date.now() + SCRIPT_DEADLINE_MS });
  console.log(
    [
      `Xong (lịch sử: ${outcome.runId}).`,
      `  Xoá: ${outcome.deleted} ảnh · giải phóng ${formatBytes(outcome.bytesFreed)}`,
      `  Còn dùng trong DB → gỡ tag: ${outcome.retagged}`,
      `  Lỗi: ${outcome.failed}`,
      `  Chưa xử lý (hết thời gian / quá giới hạn quét): ${outcome.remaining}${outcome.truncated ? " + phần chưa quét" : ""}`,
      ...outcome.errorSamples.map((line) => `  ! ${line}`),
    ].join("\n"),
  );
  if (outcome.failed > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("Lỗi:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // Kết nối Mongo (mongoose + MongoClient của lib/mongodb) giữ tiến trình sống — thoát chủ động.
  .finally(() => setTimeout(() => process.exit(), 100));

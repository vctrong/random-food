import { Types } from "mongoose";
import { cloudinary, markImagesAttached, UNATTACHED_TAG } from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";
import { MediaCleanupRun } from "@/lib/models/MediaCleanupRun";
import { findUsedPublicIds } from "@/lib/media/imageUsage";
import {
  buildOrphanSearchExpression,
  chunk,
  CLEANUP_BATCH_SIZE,
  DEFAULT_ORPHAN_DAYS,
  folderOfPublicId,
  isInsideMediaRoot,
  isOldEnough,
  orphanReferenceDate,
} from "@/lib/media/cleanupRules";

/**
 * Dọn ảnh rác trên Cloudinary — DÙNG CHUNG cho script (`npm run cleanup:images`),
 * trang Admin /admin/don-anh và cron /api/cron/cleanup-images.
 *
 * Ảnh rác = ảnh trong nayangi/ còn tag `unattached` và đã "bỏ" quá N ngày (mốc
 * `unattached_at`, không có thì ngày upload). Trước khi xoá luôn kiểm tra lại DB
 * (lib/media/imageUsage.ts): còn dùng thì chỉ gỡ tag. Idempotent — chạy lại / chạy
 * trùng chỉ gặp ảnh đã xoá (Cloudinary trả `not_found`, bỏ qua).
 */

export interface OrphanImage {
  publicId: string;
  url: string;
  folder: string;
  bytes: number;
  format: string;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  /** Mốc tính tuổi (bị gỡ khỏi nội dung, hoặc ngày upload). */
  referenceAt: string;
}

interface SearchResource {
  public_id: string;
  secure_url: string;
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  created_at: string;
  context?: unknown;
}

const SEARCH_PAGE_SIZE = 500;
/** Chặn quét vô hạn nếu có quá nhiều ảnh — phần dư để lần sau. */
const MAX_SCANNED = 5000;
/** Chừa thời gian cho 1 lô (kiểm DB + gọi xoá) trước hạn chót. */
const BATCH_TIME_RESERVE_MS = 10_000;
const MAX_ERROR_SAMPLES = 20;

export async function listOrphanImages({
  days = DEFAULT_ORPHAN_DAYS,
  folder = null,
  now = new Date(),
}: { days?: number; folder?: string | null; now?: Date } = {}): Promise<{ images: OrphanImage[]; truncated: boolean }> {
  const expression = buildOrphanSearchExpression(UNATTACHED_TAG, folder);
  const images: OrphanImage[] = [];
  let scanned = 0;
  let cursor: string | undefined;
  let truncated = false;

  do {
    let query = cloudinary.search.expression(expression).with_field("context").sort_by("created_at", "asc").max_results(SEARCH_PAGE_SIZE);
    if (cursor) query = query.next_cursor(cursor);
    const page = (await query.execute()) as { resources?: SearchResource[]; next_cursor?: string };
    for (const resource of page.resources ?? []) {
      scanned += 1;
      if (!isInsideMediaRoot(resource.public_id, folder)) continue;
      const reference = orphanReferenceDate(resource);
      if (!isOldEnough(reference, now, days)) continue;
      images.push({
        publicId: resource.public_id,
        url: resource.secure_url,
        folder: folderOfPublicId(resource.public_id),
        bytes: resource.bytes ?? 0,
        format: resource.format ?? "",
        width: resource.width ?? null,
        height: resource.height ?? null,
        uploadedAt: new Date(resource.created_at).toISOString(),
        referenceAt: reference.toISOString(),
      });
    }
    cursor = page.next_cursor;
    if (cursor && scanned >= MAX_SCANNED) {
      truncated = true;
      break;
    }
  } while (cursor);

  return { images, truncated };
}

export interface CleanupOutcome {
  /** Số ảnh rác nằm trong phạm vi lần chạy (sau khi lọc theo lựa chọn). */
  candidates: number;
  deleted: number;
  retagged: number;
  failed: number;
  bytesFreed: number;
  /** Ảnh rác chưa xử lý vì hết thời gian — lần sau làm tiếp. */
  remaining: number;
  /** Còn ảnh chưa quét tới (vượt MAX_SCANNED). */
  truncated: boolean;
  errorSamples: string[];
}

async function processBatch(images: OrphanImage[], outcome: CleanupOutcome) {
  const ids = images.map((image) => image.publicId);
  // Lớp bảo vệ thứ hai: tag có thể sai (lỗi mạng lúc gỡ tag...) — DB mới là nguồn sự thật.
  const used = await findUsedPublicIds(ids);
  const stillUsed = ids.filter((id) => used.has(id));
  if (stillUsed.length > 0) {
    await markImagesAttached(stillUsed);
    outcome.retagged += stillUsed.length;
  }

  const toDelete = images.filter((image) => !used.has(image.publicId));
  if (toDelete.length === 0) return;
  try {
    const response = (await cloudinary.api.delete_resources(
      toDelete.map((image) => image.publicId),
      { invalidate: true },
    )) as { deleted?: Record<string, string> };
    for (const image of toDelete) {
      const status = response.deleted?.[image.publicId];
      if (status === "deleted") {
        outcome.deleted += 1;
        outcome.bytesFreed += image.bytes;
      } else if (status !== "not_found") {
        outcome.failed += 1;
        outcome.errorSamples.push(`${image.publicId}: ${status ?? "không rõ kết quả"}`);
      }
    }
  } catch (error) {
    outcome.failed += toDelete.length;
    const message = (error as { error?: { message?: string } })?.error?.message ?? (error as Error)?.message ?? "lỗi không rõ";
    outcome.errorSamples.push(`Lô ${toDelete.length} ảnh: ${message}`);
  }
}

/**
 * Tìm ảnh rác rồi xoá theo lô 100 ảnh, dừng an toàn trước `deadlineAt` (epoch ms).
 * `publicIds`: chỉ xử lý các ảnh này — và chỉ khi chúng VẪN là ảnh rác lúc chạy.
 */
export async function cleanupOrphanImages({
  days = DEFAULT_ORPHAN_DAYS,
  folder = null,
  publicIds = null,
  deadlineAt,
}: {
  days?: number;
  folder?: string | null;
  publicIds?: string[] | null;
  deadlineAt: number;
}): Promise<CleanupOutcome> {
  const { images, truncated } = await listOrphanImages({ days, folder });
  const wanted = publicIds ? new Set(publicIds) : null;
  const selected = wanted ? images.filter((image) => wanted.has(image.publicId)) : images;

  const outcome: CleanupOutcome = {
    candidates: selected.length,
    deleted: 0,
    retagged: 0,
    failed: 0,
    bytesFreed: 0,
    remaining: selected.length,
    truncated,
    errorSamples: [],
  };

  for (const batch of chunk(selected, CLEANUP_BATCH_SIZE)) {
    if (Date.now() + BATCH_TIME_RESERVE_MS > deadlineAt) break;
    await processBatch(batch, outcome);
    outcome.remaining -= batch.length;
  }
  outcome.errorSamples = outcome.errorSamples.slice(0, MAX_ERROR_SAMPLES);
  return outcome;
}

/* ------------------------------ Lịch sử + AuditLog ------------------------------ */

export type CleanupTrigger = "manual" | "cron" | "script";

export async function startCleanupRun({
  trigger,
  actorId = null,
  mode,
  days,
  folder = null,
}: {
  trigger: CleanupTrigger;
  actorId?: string | null;
  mode: "selected" | "all";
  days: number;
  folder?: string | null;
}): Promise<string> {
  await connectDB();
  const run = await MediaCleanupRun.create({
    trigger,
    ...(actorId && { actorId }),
    mode,
    days,
    ...(folder && { folder }),
    startedAt: new Date(),
  });
  return String(run._id);
}

/**
 * Cộng kết quả 1 lượt (1 lô từ trang Admin, hoặc cả lần chạy cron/script) vào bản ghi
 * lịch sử và ghi AuditLog `media_cleanup` nếu lượt đó có thao tác thật.
 */
export async function recordCleanupOutcome(
  runId: string,
  outcome: CleanupOutcome,
  { trigger, actorId = null }: { trigger: CleanupTrigger; actorId?: string | null },
): Promise<void> {
  await connectDB();
  const isDone = outcome.remaining === 0 && !outcome.truncated;
  await MediaCleanupRun.updateOne(
    { _id: runId },
    {
      $inc: {
        deletedCount: outcome.deleted,
        retaggedCount: outcome.retagged,
        failedCount: outcome.failed,
        bytesFreed: outcome.bytesFreed,
      },
      $push: { errorSamples: { $each: outcome.errorSamples, $slice: MAX_ERROR_SAMPLES } },
      $set: { finishedAt: new Date(), status: isDone && outcome.failed === 0 ? "completed" : "partial" },
    },
  );

  if (outcome.deleted + outcome.retagged + outcome.failed === 0) return;
  const freedMb = (outcome.bytesFreed / 1024 / 1024).toFixed(2);
  await AuditLog.create({
    ...(actorId && { actorId }),
    action: "media_cleanup",
    targetType: "media",
    targetId: new Types.ObjectId(runId),
    reason: `Xoá ${outcome.deleted} ảnh (${freedMb} MB), gỡ tag ${outcome.retagged}, lỗi ${outcome.failed}`,
    metadata: {
      trigger,
      deleted: outcome.deleted,
      retagged: outcome.retagged,
      failed: outcome.failed,
      bytesFreed: outcome.bytesFreed,
      remaining: outcome.remaining,
    },
  });
}

/** Một lần dọn trọn gói cho cron / script: tạo lịch sử → dọn tới hạn chót → ghi kết quả. */
export async function runCleanupJob({
  trigger,
  days = DEFAULT_ORPHAN_DAYS,
  folder = null,
  deadlineAt,
}: {
  trigger: Exclude<CleanupTrigger, "manual">;
  days?: number;
  folder?: string | null;
  deadlineAt: number;
}): Promise<CleanupOutcome & { runId: string }> {
  const runId = await startCleanupRun({ trigger, mode: "all", days, folder });
  try {
    const outcome = await cleanupOrphanImages({ days, folder, deadlineAt });
    await recordCleanupOutcome(runId, outcome, { trigger });
    return { ...outcome, runId };
  } catch (error) {
    await MediaCleanupRun.updateOne(
      { _id: runId },
      { $set: { status: "partial", finishedAt: new Date() }, $push: { errorSamples: String((error as Error)?.message ?? error) } },
    );
    throw error;
  }
}

export interface CleanupRunRow {
  id: string;
  trigger: CleanupTrigger;
  actorName: string | null;
  mode: "selected" | "all";
  days: number;
  folder: string | null;
  status: "running" | "completed" | "partial";
  deletedCount: number;
  retaggedCount: number;
  failedCount: number;
  bytesFreed: number;
  errorSamples: string[];
  startedAt: string;
  finishedAt: string | null;
}

export async function listCleanupRuns(limit = 30): Promise<CleanupRunRow[]> {
  await connectDB();
  const runs = (await MediaCleanupRun.find({}).sort({ startedAt: -1 }).limit(limit).populate("actorId", "name").lean()) as unknown as {
    _id: Types.ObjectId;
    trigger: CleanupTrigger;
    actorId?: { name?: string } | null;
    mode: "selected" | "all";
    days: number;
    folder?: string;
    status: "running" | "completed" | "partial";
    deletedCount?: number;
    retaggedCount?: number;
    failedCount?: number;
    bytesFreed?: number;
    errorSamples?: string[];
    startedAt: Date;
    finishedAt?: Date;
  }[];
  return runs.map((run) => ({
    id: String(run._id),
    trigger: run.trigger,
    actorName: run.actorId?.name ?? null,
    mode: run.mode,
    days: run.days,
    folder: run.folder ?? null,
    status: run.status,
    deletedCount: run.deletedCount ?? 0,
    retaggedCount: run.retaggedCount ?? 0,
    failedCount: run.failedCount ?? 0,
    bytesFreed: run.bytesFreed ?? 0,
    errorSamples: run.errorSamples ?? [],
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
  }));
}

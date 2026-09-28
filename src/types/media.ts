/** Kiểu dữ liệu dọn ảnh rác dùng chung server (lib/media/cleanupService.ts) và client (/admin/don-anh). */

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

export interface CleanupOutcome {
  /** Số ảnh rác nằm trong phạm vi lần chạy (sau khi lọc theo lựa chọn). */
  candidates: number;
  deleted: number;
  retagged: number;
  failed: number;
  bytesFreed: number;
  /** Ảnh rác chưa xử lý vì hết thời gian — lần sau làm tiếp. */
  remaining: number;
  /** Còn ảnh chưa quét tới (vượt giới hạn quét). */
  truncated: boolean;
  errorSamples: string[];
}

export type CleanupTrigger = "manual" | "cron" | "script";

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

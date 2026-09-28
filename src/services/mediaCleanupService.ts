import { callJson, type ApiResult } from "@/services/apiClient";
import type { CleanupOutcome, CleanupRunRow, OrphanImage } from "@/types/media";

/** Lớp duy nhất phía client gọi API dọn ảnh rác (trang /admin/don-anh). */

export function listOrphanImages(): Promise<ApiResult<{ images: OrphanImage[]; truncated: boolean; days: number }>> {
  return callJson("/api/admin/media/orphans", { method: "GET" });
}

export function listCleanupRuns(): Promise<ApiResult<CleanupRunRow[]>> {
  return callJson("/api/admin/media/cleanup-runs", { method: "GET" });
}

export function runCleanupBatch(
  input: { runId: string | null } & ({ publicIds: string[] } | { all: true }),
): Promise<ApiResult<CleanupOutcome & { runId: string }>> {
  return callJson("/api/admin/media/cleanup", { method: "POST", body: JSON.stringify(input) });
}

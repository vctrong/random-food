import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import type { ReportReason, ReportTargetType } from "@/constants/reports";

/** Lớp duy nhất phía client "biết" báo cáo đi đâu — gọi /api/reports. */

export interface ReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
  duplicateOfRestaurantId?: string | null;
}

export type ServiceResult = { ok: true } | { ok: false; error: string; code?: string };

export async function sendReport(payload: ReportPayload): Promise<ServiceResult> {
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    return { ok: false, error: getApiErrorMessage(response.status, body.error), code: body.code };
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

export async function cancelReport(targetType: ReportTargetType, targetId: string): Promise<ServiceResult> {
  try {
    const response = await fetch("/api/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: getApiErrorMessage(response.status, body.error) };
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

/** Những đối tượng user đã báo cáo trong `ids`. Guest/lỗi → rỗng. */
export async function fetchMyReportedIds(targetType: ReportTargetType, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  try {
    const response = await fetch(`/api/reports?targetType=${targetType}&ids=${ids.map(encodeURIComponent).join(",")}`, {
      cache: "no-store",
    });
    if (!response.ok) return new Set();
    const data = (await response.json()) as { items?: { targetId: string }[] };
    return new Set((data.items ?? []).map((item) => item.targetId));
  } catch {
    return new Set();
  }
}

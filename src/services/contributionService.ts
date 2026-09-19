import type { AchievementStatus, Contribution } from "@/types/contribution";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";

/**
 * Lớp duy nhất "biết" đóng góp của user đến từ đâu — gọi API `/api/contributions`.
 * Chỉ dùng ở phía client ("use client" hooks/component).
 */

export interface ContributionOverview {
  contributions: Contribution[];
  achievements: AchievementStatus[];
}

export async function getMyContributions(): Promise<ContributionOverview | null> {
  try {
    const response = await fetch("/api/contributions", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as ContributionOverview;
  } catch {
    return null;
  }
}

/** Gửi bản chỉnh sửa (multipart vì có ảnh mới) — server chuyển đóng góp về `pending`. */
export async function resubmitContribution(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/contributions/${encodeURIComponent(id)}`, { method: "PATCH", body: formData });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: getApiErrorMessage(response.status, body.error) };
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

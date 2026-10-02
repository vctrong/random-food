import type { AchievementStatus, Contribution, SubmissionNoteItem } from "@/types/contribution";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import type { LocationSource, OpeningSchedule } from "@/types/restaurant";

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

export interface NewFoodPayload {
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  eatingLevels: string[];
  categoryIds: string[];
  proposedCategoryName: string | null;
  images: string[];
  restaurant:
    | { mode: "existing"; id: string }
    | {
        mode: "new";
        name: string;
        address: string;
        location: { lat: number; lng: number } | null;
        locationSource: LocationSource;
        images: string[];
        openingSchedule: OpeningSchedule;
      };
}

/** Gửi món mới (ảnh đã upload thẳng lên Cloudinary, chỉ gửi URL). */
export async function submitNewFood(payload: NewFoodPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: getApiErrorMessage(response.status, body.error) };
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

async function sendJson<T = object>(url: string, init: RequestInit): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (response.ok) return { ok: true, ...body };
    return { ok: false, error: getApiErrorMessage(response.status, body.error) };
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

/**
 * Gửi bản chỉnh sửa (multipart vì có ảnh mới). `pending`: lưu, trừ 1 lượt sửa;
 * `needs_revision`: lưu và gửi lại → `pending`.
 */
export function saveContributionEdit(id: string, formData: FormData) {
  return sendJson<{ status: string; remainingEdits: number | null }>(`/api/contributions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: formData,
  });
}

/** Rút đề xuất (pending / in_review / needs_revision → withdrawn). */
export function withdrawContribution(id: string) {
  return sendJson(`/api/contributions/${encodeURIComponent(id)}/withdraw`, { method: "POST" });
}

/** Gửi ghi chú đính chính cho FoodReviewer đang xác minh. */
export function sendCorrectionNote(id: string, content: string) {
  return sendJson<{ note: SubmissionNoteItem }>(`/api/contributions/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

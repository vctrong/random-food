import type { AchievementStatus, Contribution } from "@/types/contribution";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import type { LocationSource } from "@/types/restaurant";

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

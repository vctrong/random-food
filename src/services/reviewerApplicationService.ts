import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";

/**
 * Lớp duy nhất "biết" đơn ứng tuyển FoodReviewer của user đi qua đâu — gọi API
 * `/api/reviewer-applications`. Chỉ dùng ở phía client.
 */

type ServiceResult = { ok: true } | { ok: false; error: string };

async function toResult(response: Response): Promise<ServiceResult> {
  if (response.ok) return { ok: true };
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: getApiErrorMessage(response.status, body.error) };
}

export async function submitReviewerApplication(formData: FormData): Promise<ServiceResult> {
  try {
    return await toResult(await fetch("/api/reviewer-applications", { method: "POST", body: formData }));
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

export async function withdrawReviewerApplication(id: string): Promise<ServiceResult> {
  try {
    return await toResult(
      await fetch(`/api/reviewer-applications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      }),
    );
  } catch {
    return { ok: false, error: getNetworkErrorMessage() };
  }
}

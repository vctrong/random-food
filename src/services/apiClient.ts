import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";

/**
 * Gọi API JSON dùng chung cho các service phía client: timeout 20s, phân biệt
 * mất mạng / quá thời gian, trả lỗi dạng { code, message } thống nhất.
 */

const REQUEST_TIMEOUT_MS = 20_000;

export type ApiFailure = {
  ok: false;
  status: number;
  /** Mã lỗi server (docs/forgot-password.md) hoặc "NETWORK" / "TIMEOUT" phía client. */
  code: string;
  message: string;
  retryAfterMs?: number;
  attemptsLeft?: number;
};

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export async function callJson<T>(url: string, init: RequestInit): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      code: isTimeout ? "TIMEOUT" : "NETWORK",
      message: isTimeout ? "Máy chủ phản hồi quá chậm, vui lòng thử lại." : getNetworkErrorMessage(),
    };
  } finally {
    window.clearTimeout(timer);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: typeof data.code === "string" ? data.code : "HTTP_ERROR",
      message: getApiErrorMessage(response.status, typeof data.error === "string" ? data.error : undefined),
      retryAfterMs: typeof data.retryAfterMs === "number" ? data.retryAfterMs : undefined,
      attemptsLeft: typeof data.attemptsLeft === "number" ? data.attemptsLeft : undefined,
    };
  }
  return { ok: true, data: data as T };
}

export function toLocalClock(serverTime: unknown): (timestamp: number) => number {
  const offset = typeof serverTime === "number" ? Date.now() - serverTime : 0;
  return (timestamp) => timestamp + offset;
}

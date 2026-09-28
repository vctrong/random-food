import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PASSWORD_RESET_CONFIG,
  PASSWORD_RESET_IP_LIMITS,
  RESET_TOKEN_COOKIE,
  RESET_TOKEN_COOKIE_PATH,
} from "@/constants/passwordReset";
import { PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { hitRateLimit } from "@/lib/rateLimit";
import { getPasswordResetService } from "@/lib/passwordResetStore";
import type {
  RequestContext,
  RequestOtpResult,
  ResendUnlockResult,
  ResetPasswordResult,
  UnlockResult,
  VerifyOtpResult,
} from "@/lib/passwordReset";

/**
 * Lớp dịch "kết quả nghiệp vụ → HTTP" dùng chung cho các route Quên mật khẩu,
 * để từng route.ts chỉ còn parse request + gọi 1 hàm (CLAUDE.md mục 2.4).
 * Mã lỗi (`code`) + thông báo tiếng Việt liệt kê ở docs/forgot-password.md.
 */

export function getRequestContext(request: NextRequest): RequestContext {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export function errorJson(status: number, code: string, error: string, extra: Record<string, unknown> = {}, retryAfterMs?: number) {
  return NextResponse.json(
    { error, code, ...extra, ...(retryAfterMs !== undefined && { retryAfterMs }) },
    { status, headers: retryAfterMs !== undefined ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined },
  );
}

const LOCKED_MESSAGE =
  "Tài khoản đang tạm khoá do nhập sai mã xác thực quá nhiều lần. Vui lòng kiểm tra email để mở khoá tài khoản.";

/** Giới hạn theo IP; trả response 429 nếu vượt, null nếu được đi tiếp. */
export async function enforceIpLimit(
  scope: keyof typeof PASSWORD_RESET_IP_LIMITS,
  context: RequestContext,
): Promise<NextResponse | null> {
  const { limit, windowMs } = PASSWORD_RESET_IP_LIMITS[scope];
  const result = await hitRateLimit(`pwreset:${scope}:ip:${context.ip ?? "unknown"}`, limit, windowMs);
  if (result.allowed) return null;
  return errorJson(429, "RATE_LIMITED", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.", {}, result.retryAfterMs);
}

/**
 * Kéo mọi phản hồi của bước gửi OTP tới cùng 1 mốc thời gian tối thiểu (+ nhiễu
 * nhỏ) — nhánh phải gửi SMTP và nhánh báo lỗi không phân biệt được qua độ trễ.
 */
async function padResponse(startedAt: number): Promise<void> {
  const target = PASSWORD_RESET_CONFIG.minRequestResponseMs + Math.floor(Math.random() * 200);
  const remaining = target - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

function requestOtpResponse(result: RequestOtpResult): NextResponse {
  switch (result.kind) {
    case "sent":
    case "alreadySent":
      return NextResponse.json({
        ok: true,
        resent: result.kind === "sent",
        message: "Mã xác thực đã được gửi tới hộp thư của bạn.",
        state: result.state,
        serverTime: Date.now(),
      });
    case "invalidEmail":
      return errorJson(400, "INVALID_EMAIL", "Email không hợp lệ.");
    case "accountNotFound":
      return errorJson(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản hoặc tài khoản chưa xác thực email.");
    case "googleAccount":
      return errorJson(
        409,
        "GOOGLE_ACCOUNT",
        "Tài khoản này đăng nhập bằng Google nên không có mật khẩu để đặt lại. Hãy chọn “Tiếp tục với Google” ở trang đăng nhập.",
      );
    case "locked":
      return errorJson(423, "ACCOUNT_LOCKED", LOCKED_MESSAGE);
    case "cooldown":
      return errorJson(429, "RESEND_COOLDOWN", `Vui lòng đợi ${Math.ceil(result.retryAfterMs / 1000)} giây trước khi gửi lại mã.`, {}, result.retryAfterMs);
    case "limit":
      return errorJson(
        429,
        "RESEND_LIMIT",
        `Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(result.retryAfterMs / 60_000)} phút.`,
        {},
        result.retryAfterMs,
      );
    case "emailFailed":
      return errorJson(503, "EMAIL_FAILED", "Không gửi được email lúc này. Vui lòng thử lại sau ít phút.");
  }
}

export async function handleRequestOtp(request: NextRequest, mode: "initial" | "resend"): Promise<NextResponse> {
  const startedAt = Date.now();
  const context = getRequestContext(request);
  const limited = await enforceIpLimit("requestOtp", context);
  if (limited) return limited;

  const body = await readJsonBody(request);
  let response: NextResponse;
  try {
    const result = await getPasswordResetService().requestOtp(stringField(body, "email"), mode, context);
    response = requestOtpResponse(result);
  } catch {
    response = errorJson(500, "SERVER_ERROR", "Hệ thống đang gặp sự cố, vui lòng thử lại sau.");
  }
  await padResponse(startedAt);
  return response;
}

export function verifyOtpResponse(result: VerifyOtpResult): NextResponse {
  switch (result.kind) {
    case "verified": {
      const response = NextResponse.json({ ok: true, resetExpiresAt: result.resetExpiresAt, serverTime: Date.now() });
      response.cookies.set(RESET_TOKEN_COOKIE, result.resetToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: RESET_TOKEN_COOKIE_PATH,
        expires: new Date(result.resetExpiresAt),
      });
      return response;
    }
    case "invalidInput":
      return errorJson(400, "INVALID_OTP_FORMAT", "Mã xác thực gồm 6 chữ số.");
    case "incorrect":
      return errorJson(400, "OTP_INCORRECT", `Mã xác thực không đúng. Bạn còn ${result.attemptsLeft} lần thử.`, {
        attemptsLeft: result.attemptsLeft,
      });
    case "expired":
      return errorJson(410, "OTP_EXPIRED", "Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.");
    case "noActiveOtp":
      return errorJson(
        410,
        "OTP_INVALIDATED",
        "Mã này không còn hiệu lực (đã được dùng hoặc đã có mã mới hơn). Vui lòng dùng mã mới nhất hoặc gửi lại mã.",
      );
    case "locked":
      return errorJson(423, "ACCOUNT_LOCKED", LOCKED_MESSAGE, { justLocked: result.justLocked });
  }
}

export function clearResetCookie(response: NextResponse): NextResponse {
  response.cookies.set(RESET_TOKEN_COOKIE, "", { httpOnly: true, path: RESET_TOKEN_COOKIE_PATH, maxAge: 0 });
  return response;
}

export function readResetCookie(request: NextRequest): string | null {
  return request.cookies.get(RESET_TOKEN_COOKIE)?.value ?? null;
}

export function resetPasswordResponse(result: ResetPasswordResult): NextResponse {
  switch (result.kind) {
    case "success":
      return clearResetCookie(NextResponse.json({ ok: true }));
    case "sessionExpired":
      return clearResetCookie(
        errorJson(410, "RESET_SESSION_EXPIRED", "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng bắt đầu lại từ bước nhập email."),
      );
    case "mismatch":
      return errorJson(400, "PASSWORD_MISMATCH", "Mật khẩu xác nhận không khớp.");
    case "weakPassword":
      return errorJson(400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
    case "samePassword":
      return errorJson(400, "SAME_PASSWORD", "Mật khẩu mới phải khác mật khẩu hiện tại.");
  }
}

export function unlockResponse(result: UnlockResult): NextResponse {
  switch (result.kind) {
    case "unlocked":
      return NextResponse.json({ ok: true });
    case "expired":
      return errorJson(410, "UNLOCK_EXPIRED", "Liên kết mở khoá đã hết hạn.");
    case "invalid":
      return errorJson(400, "UNLOCK_INVALID", "Liên kết mở khoá không hợp lệ hoặc đã được sử dụng.");
  }
}

export function resendUnlockResponse(result: ResendUnlockResult): NextResponse {
  switch (result.kind) {
    case "accepted":
      return NextResponse.json({
        ok: true,
        message: "Nếu tài khoản đang bị tạm khoá, email mở khoá mới đã được gửi tới hộp thư.",
      });
    case "invalid":
      return errorJson(400, "UNLOCK_INVALID", "Liên kết mở khoá không hợp lệ.");
    case "cooldown":
      return errorJson(429, "RESEND_COOLDOWN", `Vui lòng đợi ${Math.ceil(result.retryAfterMs / 1000)} giây trước khi gửi lại.`, {}, result.retryAfterMs);
    case "limit":
      return errorJson(
        429,
        "RESEND_LIMIT",
        `Bạn đã yêu cầu gửi lại quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(result.retryAfterMs / 60_000)} phút.`,
        {},
        result.retryAfterMs,
      );
    case "emailFailed":
      return errorJson(503, "EMAIL_FAILED", "Không gửi được email lúc này. Vui lòng thử lại sau ít phút.");
  }
}

export function serverErrorResponse(): NextResponse {
  return errorJson(500, "SERVER_ERROR", "Hệ thống đang gặp sự cố, vui lòng thử lại sau.");
}

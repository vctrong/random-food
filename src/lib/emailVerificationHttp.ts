import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCOUNT_LINK_IP_LIMITS,
  EMAIL_VERIFICATION_USER_LIMITS,
  PASSWORD_LINK_CONFIG,
  PASSWORD_LINK_COOKIE,
  PASSWORD_LINK_COOKIE_PATH,
} from "@/constants/emailVerification";
import { hitRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";
import { PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { errorJson } from "@/lib/passwordResetHttp";
import type { RequestContext } from "@/lib/passwordReset";
import type {
  ConfirmCodeResult,
  ConfirmPasswordLinkResult,
  EmailCheckResult,
  ResendPasswordLinkResult,
  SendCodeResult,
  SetInitialPasswordResult,
  StartPasswordLinkResult,
} from "@/lib/emailVerification";

/** Dịch kết quả xác thực email / thêm mật khẩu → HTTP. Mã lỗi liệt kê ở docs/email-verification.md. */

/** Trả userId nếu đã đăng nhập và chưa vượt giới hạn; ngược lại trả response lỗi. */
export async function authorizeVerificationRequest(
  scope: keyof typeof EMAIL_VERIFICATION_USER_LIMITS,
): Promise<{ userId: string } | { response: NextResponse }> {
  const auth = await requireAuth();
  if (!auth.ok) return { response: errorJson(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.") };
  const { limit, windowMs } = EMAIL_VERIFICATION_USER_LIMITS[scope];
  const rate = await hitRateLimit(`verify-email:${scope}:user:${auth.id}`, limit, windowMs);
  if (!rate.allowed) {
    return { response: errorJson(429, "RATE_LIMITED", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.", {}, rate.retryAfterMs) };
  }
  return { userId: auth.id };
}

/** Giới hạn theo IP cho các API khách của luồng đăng ký; null nếu được đi tiếp. */
export async function enforceAccountLinkIpLimit(
  scope: keyof typeof ACCOUNT_LINK_IP_LIMITS,
  context: RequestContext,
): Promise<NextResponse | null> {
  const { limit, windowMs } = ACCOUNT_LINK_IP_LIMITS[scope];
  const result = await hitRateLimit(`account-link:${scope}:ip:${context.ip ?? "unknown"}`, limit, windowMs);
  if (result.allowed) return null;
  return errorJson(429, "RATE_LIMITED", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.", {}, result.retryAfterMs);
}

export function readPasswordLinkCookie(request: NextRequest): string | null {
  return request.cookies.get(PASSWORD_LINK_COOKIE)?.value ?? null;
}

function setPasswordLinkCookie(response: NextResponse, flowToken: string): NextResponse {
  response.cookies.set(PASSWORD_LINK_COOKIE, flowToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: PASSWORD_LINK_COOKIE_PATH,
    maxAge: PASSWORD_LINK_CONFIG.recordRetentionMs / 1000,
  });
  return response;
}

function clearPasswordLinkCookie(response: NextResponse): NextResponse {
  response.cookies.set(PASSWORD_LINK_COOKIE, "", { httpOnly: true, path: PASSWORD_LINK_COOKIE_PATH, maxAge: 0 });
  return response;
}

const ALREADY_VERIFIED = () => errorJson(409, "ALREADY_VERIFIED", "Email của bạn đã được xác thực.");
const NOT_FOUND = () => errorJson(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
const EMAIL_TAKEN = () => errorJson(409, "EMAIL_TAKEN", "Email đã được sử dụng.");
const ALREADY_HAS_PASSWORD = () =>
  errorJson(409, "ALREADY_HAS_PASSWORD", "Tài khoản này đã có mật khẩu. Vui lòng đăng nhập bằng email và mật khẩu.");
const SESSION_INVALID = () =>
  errorJson(410, "LINK_SESSION_INVALID", "Phiên xác thực không còn hợp lệ. Vui lòng quay lại bước trước và thử lại.");
const ACCOUNT_UNAVAILABLE = () =>
  errorJson(423, "ACCOUNT_UNAVAILABLE", "Tài khoản gắn với email này đang bị khoá nên chưa thể thêm mật khẩu.");

/** Cooldown / giới hạn giờ / SMTP lỗi — chung cho mọi bước gửi mã. */
function sendFailureResponse(result: { kind: "cooldown" | "limit"; retryAfterMs: number } | { kind: "emailFailed" }): NextResponse {
  switch (result.kind) {
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

/** Mã sai / hết hạn / bị huỷ — chung cho mọi bước xác nhận mã. */
function codeFailureResponse(
  result: Extract<ConfirmCodeResult, { kind: "invalidInput" | "incorrect" | "tooManyAttempts" | "expired" | "noActiveCode" }>,
): NextResponse {
  switch (result.kind) {
    case "invalidInput":
      return errorJson(400, "INVALID_OTP_FORMAT", "Mã xác thực gồm 6 chữ số.");
    case "incorrect":
      return errorJson(400, "OTP_INCORRECT", `Mã xác thực không đúng. Bạn còn ${result.attemptsLeft} lần thử.`, {
        attemptsLeft: result.attemptsLeft,
      });
    case "tooManyAttempts":
      return errorJson(410, "OTP_TOO_MANY_ATTEMPTS", "Bạn đã nhập sai quá nhiều lần nên mã đã bị huỷ. Vui lòng gửi mã mới.");
    case "expired":
      return errorJson(410, "OTP_EXPIRED", "Mã xác thực đã hết hạn. Vui lòng gửi mã mới.");
    case "noActiveCode":
      return errorJson(410, "OTP_INVALIDATED", "Mã này không còn hiệu lực. Vui lòng dùng mã mới nhất hoặc gửi mã mới.");
  }
}

export function sendCodeResponse(result: SendCodeResult): NextResponse {
  switch (result.kind) {
    case "sent":
      return NextResponse.json({ ok: true, state: result.state, serverTime: Date.now() });
    case "alreadyVerified":
      return ALREADY_VERIFIED();
    case "notFound":
      return NOT_FOUND();
    default:
      return sendFailureResponse(result);
  }
}

export function confirmCodeResponse(result: ConfirmCodeResult): NextResponse {
  switch (result.kind) {
    case "verified":
      return NextResponse.json({ ok: true });
    case "alreadyVerified":
      return ALREADY_VERIFIED();
    case "notFound":
      return NOT_FOUND();
    default:
      return codeFailureResponse(result);
  }
}

export function setInitialPasswordResponse(result: SetInitialPasswordResult): NextResponse {
  switch (result.kind) {
    case "created":
      return NextResponse.json({ ok: true });
    case "notFound":
      return NOT_FOUND();
    case "notVerified":
      return errorJson(403, "EMAIL_NOT_VERIFIED", "Vui lòng xác thực email trước khi tạo mật khẩu.");
    case "alreadyHasPassword":
      return errorJson(409, "ALREADY_HAS_PASSWORD", "Tài khoản của bạn đã có mật khẩu.");
    case "mismatch":
      return errorJson(400, "PASSWORD_MISMATCH", "Mật khẩu xác nhận không khớp.");
    case "weakPassword":
      return errorJson(400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
  }
}

/** `status` cho form đăng ký: "available" đi tiếp, "taken" báo lỗi, "google_only" sang luồng thêm mật khẩu. */
export function checkEmailResponse(result: EmailCheckResult): NextResponse {
  switch (result.kind) {
    case "invalidEmail":
      return errorJson(400, "INVALID_EMAIL", "Email không hợp lệ.");
    case "available":
      return NextResponse.json({ status: "available" });
    case "taken":
      return NextResponse.json({ status: "taken", message: "Email đã được sử dụng." });
    case "googleOnly":
      return NextResponse.json({ status: "google_only" });
  }
}

export function startPasswordLinkResponse(result: StartPasswordLinkResult): NextResponse {
  switch (result.kind) {
    case "sent":
      return setPasswordLinkCookie(NextResponse.json({ ok: true, state: result.state, serverTime: Date.now() }), result.flowToken);
    case "invalidEmail":
      return errorJson(400, "INVALID_EMAIL", "Email không hợp lệ.");
    case "weakPassword":
      return errorJson(400, "WEAK_PASSWORD", PASSWORD_POLICY_MESSAGE);
    case "available":
      return errorJson(409, "NO_GOOGLE_ACCOUNT", "Email này chưa có tài khoản. Vui lòng tiếp tục đăng ký như bình thường.");
    case "taken":
      return EMAIL_TAKEN();
    case "unavailable":
      return ACCOUNT_UNAVAILABLE();
    default:
      return sendFailureResponse(result);
  }
}

export function resendPasswordLinkResponse(result: ResendPasswordLinkResult): NextResponse {
  switch (result.kind) {
    case "sent":
      return NextResponse.json({ ok: true, state: result.state, serverTime: Date.now() });
    case "sessionInvalid":
      return clearPasswordLinkCookie(SESSION_INVALID());
    case "alreadyHasPassword":
      return clearPasswordLinkCookie(ALREADY_HAS_PASSWORD());
    default:
      return sendFailureResponse(result);
  }
}

export function confirmPasswordLinkResponse(result: ConfirmPasswordLinkResult): NextResponse {
  switch (result.kind) {
    case "linked":
      return clearPasswordLinkCookie(NextResponse.json({ ok: true }));
    case "sessionInvalid":
      return clearPasswordLinkCookie(SESSION_INVALID());
    case "alreadyHasPassword":
      return clearPasswordLinkCookie(ALREADY_HAS_PASSWORD());
    case "unavailable":
      return clearPasswordLinkCookie(ACCOUNT_UNAVAILABLE());
    default:
      return codeFailureResponse(result);
  }
}

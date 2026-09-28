import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { authorizeVerificationRequest, sendCodeResponse } from "@/lib/emailVerificationHttp";
import { getRequestContext, serverErrorResponse } from "@/lib/passwordResetHttp";
import { requireAuth } from "@/lib/requireAuth";

/** Trạng thái xác thực email + mã đang còn hạn (để reload trang Hồ sơ vẫn nhập tiếp được). */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  try {
    const status = await getEmailVerificationService().getStatus(auth.id);
    if (!status) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
    return NextResponse.json(status);
  } catch {
    return serverErrorResponse();
  }
}

/** Gửi mã xác thực email (OTP 6 số) tới email của tài khoản đang đăng nhập. */
export async function POST(request: NextRequest) {
  const authorized = await authorizeVerificationRequest("send");
  if ("response" in authorized) return authorized.response;
  try {
    return sendCodeResponse(await getEmailVerificationService().sendCode(authorized.userId, getRequestContext(request)));
  } catch {
    return serverErrorResponse();
  }
}

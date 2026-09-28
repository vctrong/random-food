import type { NextRequest } from "next/server";
import { getEmailVerificationService } from "@/lib/emailVerificationStore";
import { authorizeVerificationRequest, setInitialPasswordResponse } from "@/lib/emailVerificationHttp";
import { createNotification } from "@/lib/notify";
import { getRequestContext, readJsonBody, serverErrorResponse, stringField } from "@/lib/passwordResetHttp";

/** Hồ sơ: tạo mật khẩu đầu tiên — chỉ khi email đã xác thực và tài khoản chưa có mật khẩu (tài khoản Google). */
export async function POST(request: NextRequest) {
  const authorized = await authorizeVerificationRequest("confirm");
  if ("response" in authorized) return authorized.response;
  const body = await readJsonBody(request);
  try {
    const result = await getEmailVerificationService().setInitialPassword(
      authorized.userId,
      stringField(body, "password"),
      stringField(body, "confirmPassword"),
      getRequestContext(request),
    );
    if (result.kind === "created") {
      await createNotification({
        userId: authorized.userId,
        type: "password_changed",
        message: "Bạn vừa tạo mật khẩu — từ giờ có thể đăng nhập bằng email và mật khẩu.",
      });
    }
    return setInitialPasswordResponse(result);
  } catch {
    return serverErrorResponse();
  }
}

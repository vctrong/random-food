import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { changeUserRole, getUsers, setAccountStatus } from "@/lib/admin/users";

const ROLES = new Set(["user", "foodreviewer", "admin"]);
const STATUSES = new Set(["active", "banned"]);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy người dùng.",
  CANNOT_DEMOTE_SELF: "Không thể tự hạ quyền hoặc tự khoá tài khoản của chính mình.",
};

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const users = await getUsers();
  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const targetUserId = body?.userId;
  if (typeof targetUserId !== "string" || !targetUserId || !isValidObjectId(targetUserId)) {
    return NextResponse.json({ error: "Thiếu hoặc sai userId." }, { status: 400 });
  }

  if (typeof body?.role === "string") {
    if (!ROLES.has(body.role)) {
      return NextResponse.json({ error: "Role không hợp lệ." }, { status: 400 });
    }
    const result = await changeUserRole({ adminId: admin.id, targetUserId, role: body.role });
    if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (typeof body?.accountStatus === "string") {
    if (!STATUSES.has(body.accountStatus)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    const result = await setAccountStatus({
      adminId: admin.id,
      targetUserId,
      status: body.accountStatus,
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Thiếu role hoặc accountStatus để cập nhật." }, { status: 400 });
}

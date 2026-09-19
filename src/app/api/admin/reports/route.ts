import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getReports, handleReport } from "@/lib/admin/reports";

const STATUSES = new Set(["pending", "reviewed"]);
const ACTIONS = new Set(["keep", "hide", "remove", "warn_user", "ban_user"]);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy báo cáo.",
  NOT_PENDING: "Báo cáo này đã được xử lý trước đó.",
};

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const reports = await getReports(status && STATUSES.has(status) ? (status as "pending" | "reviewed") : undefined);
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const reportId = body?.reportId;
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note : "";

  if (typeof reportId !== "string" || !reportId) {
    return NextResponse.json({ error: "Thiếu reportId." }, { status: 400 });
  }
  if (typeof action !== "string" || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "Thiếu hoặc sai action." }, { status: 400 });
  }

  const result = await handleReport({
    adminId: admin.id,
    reportId,
    action: action as "keep" | "hide" | "remove" | "warn_user" | "ban_user",
    note,
  });

  if (result.error) return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true });
}

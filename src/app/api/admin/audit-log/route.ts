import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { getAuditLog } from "@/lib/admin/auditLog";

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? undefined;
  const targetType = searchParams.get("targetType") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const result = await getAuditLog({ action, targetType, page, pageSize: 20 });
  return NextResponse.json(result);
}

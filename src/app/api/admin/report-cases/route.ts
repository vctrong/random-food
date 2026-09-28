import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { listReportCases } from "@/lib/admin/reportCases";
import type { ReportCaseStatus, ReportTargetType } from "@/constants/reports";

const STATUSES = new Set<ReportCaseStatus>(["pending", "resolved", "dismissed"]);
const TYPES = new Set<ReportTargetType>(["review", "food", "restaurant"]);

/** Danh sách case báo cáo — CHỈ Admin (BR-A09). `?status=pending&type=review` */
export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReportCaseStatus | null;
  const type = searchParams.get("type") as ReportTargetType | null;
  const cases = await listReportCases({
    status: status && STATUSES.has(status) ? status : undefined,
    targetType: type && TYPES.has(type) ? type : undefined,
  });
  return NextResponse.json(cases);
}

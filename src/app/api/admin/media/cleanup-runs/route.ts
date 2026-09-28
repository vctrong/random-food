import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { listCleanupRuns } from "@/lib/media/cleanupService";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  return NextResponse.json(await listCleanupRuns());
}

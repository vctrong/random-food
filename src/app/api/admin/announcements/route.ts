import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { createAnnouncement, listAdminAnnouncements } from "@/lib/announcements";
import { ANNOUNCEMENT_ERROR_MESSAGES } from "./errors";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  return NextResponse.json(await listAdminAnnouncements());
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();

  const body = await request.json().catch(() => null);
  const result = await createAnnouncement(admin.id, body);
  if (result.error) return NextResponse.json({ error: ANNOUNCEMENT_ERROR_MESSAGES[result.error] }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id, slug: result.slug }, { status: 201 });
}

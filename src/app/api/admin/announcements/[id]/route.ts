import { NextResponse } from "next/server";
import { apiNotFound } from "@/lib/http404";
import { requireAdminSession } from "@/lib/admin/session";
import { deleteAnnouncement, getAdminAnnouncement, updateAnnouncement } from "@/lib/announcements";
import { ANNOUNCEMENT_ERROR_MESSAGES } from "../errors";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  const { id } = await params;
  const announcement = await getAdminAnnouncement(id);
  if (!announcement) return NextResponse.json({ error: ANNOUNCEMENT_ERROR_MESSAGES.NOT_FOUND }, { status: 404 });
  return NextResponse.json(announcement);
}

export async function PATCH(request: Request, { params }: Context) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await updateAnnouncement(admin.id, id, body);
  if (result.error) {
    return NextResponse.json({ error: ANNOUNCEMENT_ERROR_MESSAGES[result.error] }, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }
  return NextResponse.json({ ok: true, slug: result.slug });
}

export async function DELETE(_request: Request, { params }: Context) {
  const admin = await requireAdminSession();
  if (!admin) return apiNotFound();
  const { id } = await params;
  const result = await deleteAnnouncement(admin.id, id);
  if (result.error) return NextResponse.json({ error: ANNOUNCEMENT_ERROR_MESSAGES.NOT_FOUND }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { deleteNotifications, listNotifications, markNotificationsRead } from "@/lib/notifications/inbox";
import { NOTIFICATION_PAGE_SIZE, NOTIFICATION_PAGE_SIZE_MAX } from "@/constants/notifications";

const idsSchema = z.array(z.string().refine((value) => isValidObjectId(value))).min(1).max(100);
const patchSchema = z.union([z.object({ ids: idsSchema }).strict(), z.object({ all: z.literal(true) }).strict()]);
const deleteSchema = z.object({ ids: idsSchema }).strict();

function unauthorized() {
  return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return unauthorized();

  const params = new URL(request.url).searchParams;
  const limitParam = Number(params.get("limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, NOTIFICATION_PAGE_SIZE_MAX) : NOTIFICATION_PAGE_SIZE;

  const result = await listNotifications(auth.id, {
    cursor: params.get("cursor") ?? undefined,
    limit,
    unreadOnly: params.get("unread") === "1",
  });
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return unauthorized();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  await markNotificationsRead(auth.id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return unauthorized();

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const deleted = await deleteNotifications(auth.id, parsed.data.ids);
  return NextResponse.json({ ok: true, deleted });
}

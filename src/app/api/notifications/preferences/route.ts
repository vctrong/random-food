import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/requireAuth";
import { getNotificationPreferences, updateEmailPreferences } from "@/lib/notifications/preferences";
import { OPTIONAL_EMAIL_DEFAULTS } from "@/constants/notifications";

// Chỉ nhận key thuộc loại email tuỳ chọn — .strict() chặn cả loại bắt buộc lẫn key lạ.
const patchSchema = z
  .object({
    email: z
      .object(Object.fromEntries(Object.keys(OPTIONAL_EMAIL_DEFAULTS).map((key) => [key, z.boolean().optional()])))
      .strict(),
  })
  .strict();

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  return NextResponse.json(await getNotificationPreferences(auth.id));
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tuỳ chọn thông báo không hợp lệ." }, { status: 400 });

  const email = Object.fromEntries(
    Object.entries(parsed.data.email).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
  return NextResponse.json(await updateEmailPreferences(auth.id, email));
}

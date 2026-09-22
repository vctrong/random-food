import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Log } from "@/lib/models/Log";

/**
 * Action hợp lệ hiện tại chỉ có "random" — ghi lại mỗi lượt bấm Random (kể cả
 * Guest) để làm số liệu thật "lượt random 90 ngày qua" ở landing page. Không
 * chặn/ảnh hưởng luồng random nếu request lỗi (gọi fire-and-forget từ client).
 */
const postSchema = z.object({ action: z.literal("random") }).strict();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu log không hợp lệ." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  await connectDB();
  await Log.create({
    userId: userId ?? undefined,
    action: parsed.data.action,
    ip: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

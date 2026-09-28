import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { authorizeChannel, userChannel } from "@/lib/realtime/realtimeService";

// Định dạng socket_id của Pusher: "<số>.<số>".
const SOCKET_ID_PATTERN = /^\d+\.\d+$/;

/** Xác thực private channel — mỗi user chỉ vào được đúng kênh `private-user-{id}` của mình. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  // pusher-js gửi form-urlencoded mặc định.
  const form = await request.formData().catch(() => null);
  const socketId = String(form?.get("socket_id") ?? "");
  const channel = String(form?.get("channel_name") ?? "");

  if (!SOCKET_ID_PATTERN.test(socketId) || channel !== userChannel(auth.id)) {
    return NextResponse.json({ error: "Không có quyền vào kênh này." }, { status: 403 });
  }

  const signature = authorizeChannel(socketId, channel);
  if (!signature) return NextResponse.json({ error: "Realtime chưa được cấu hình." }, { status: 503 });
  return NextResponse.json(signature);
}

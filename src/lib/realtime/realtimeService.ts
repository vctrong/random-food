import Pusher from "pusher";

/**
 * Lớp trừu tượng realtime — nơi DUY NHẤT import SDK nhà cung cấp (Pusher Channels,
 * docs/notifications.md mục 4). Đổi sang Soketi/Ably chỉ sửa file này.
 * Chưa cấu hình PUSHER_* → mọi hàm là no-op / báo chưa bật, client tự polling.
 */

let client: Pusher | null | undefined;

function getClient(): Pusher | null {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  client =
    PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
      ? new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
      : null;
  return client;
}

export function isRealtimeConfigured(): boolean {
  return getClient() !== null;
}

export function userChannel(userId: string): string {
  return `private-user-${userId}`;
}

/** Chỉ gửi tín hiệu nhẹ (type + id) — dữ liệu thật client luôn lấy lại từ API. */
export async function publish(channel: string, event: string, data: Record<string, unknown>): Promise<void> {
  const pusher = getClient();
  if (!pusher) return;
  await pusher.trigger(channel, event, data);
}

/**
 * Ký quyền vào private channel. Route gọi hàm này phải tự kiểm tra channel thuộc
 * về chính user đang đăng nhập — hàm không biết session.
 */
export function authorizeChannel(socketId: string, channel: string): Record<string, unknown> | null {
  const pusher = getClient();
  if (!pusher) return null;
  return pusher.authorizeChannel(socketId, channel) as unknown as Record<string, unknown>;
}

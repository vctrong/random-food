import { connectDB } from "@/lib/mongodb";
import { RateLimit } from "@/lib/models/RateLimit";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * Rate limit cửa sổ cố định lưu MongoDB (đúng cả khi nhiều instance). Đếm bằng
 * 1 lệnh upsert $inc nguyên tử; cửa sổ đã qua thì xoá để mở cửa sổ mới (không
 * chờ TTL monitor của Mongo — chạy ~60s/lần).
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await connectDB();
  const now = new Date();
  await RateLimit.deleteOne({ key, expireAt: { $lte: now } });

  const increment = () =>
    RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expireAt: new Date(now.getTime() + windowMs) } },
      { upsert: true, new: true },
    ).lean() as Promise<{ count: number; expireAt: Date } | null>;

  let entry: { count: number; expireAt: Date } | null;
  try {
    entry = await increment();
  } catch {
    // 2 request cùng upsert 1 key mới → 1 cái dính duplicate key; thử lại là $inc vào bản ghi vừa tạo.
    entry = await increment();
  }
  if (!entry || entry.count <= limit) return { allowed: true };
  return { allowed: false, retryAfterMs: Math.max(1000, new Date(entry.expireAt).getTime() - now.getTime()) };
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Helper generic: chỉ cần đã đăng nhập, không quan tâm role — dùng cho các route
 * thao tác dữ liệu CỦA CHÍNH user (favorites/experiences/reviews...), khác với
 * requireReviewerSession()/requireAdminSession() vốn còn kiểm tra role cụ thể.
 * Không phải cơ chế auth mới — vẫn đọc session JWT qua NextAuth như mọi nơi khác.
 */
export type AuthSessionResult = { ok: true; id: string } | { ok: false; status: 401 };

export async function requireAuth(): Promise<AuthSessionResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return { ok: false, status: 401 };
  return { ok: true, id: user.id };
}

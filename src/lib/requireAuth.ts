import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolvePostLoginRedirect } from "@/lib/safe-redirect";

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

/**
 * BR-S09: gọi ở server component của trang chỉ-dành-cho-khách (xem
 * GUEST_ONLY_PAGES) — đã đăng nhập thì redirect() trước khi render nên không
 * nháy form. Dùng getServerSession (callback session() có DB) thay vì proxy để
 * phiên idle/bị thu hồi — JWT còn hạn nhưng session.user đã bị gỡ — vẫn được
 * coi là khách và vào được trang đăng nhập.
 */
export async function redirectIfAuthenticated(callbackUrl: string | string[] | undefined): Promise<void> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (user?.id) redirect(resolvePostLoginRedirect(typeof callbackUrl === "string" ? callbackUrl : null));
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Chỉ role "admin" được vào khu vực quản trị — khác /reviewer (cho phép cả foodreviewer). */
export async function requireAdminSession(): Promise<{ id: string; role: string } | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") return null;
  return { id: user.id, role: user.role };
}

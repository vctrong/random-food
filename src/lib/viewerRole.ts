import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Role người xem cho nội dung công khai theo đối tượng (Announcement) — null = Guest. */
export async function getViewer(): Promise<{ id: string | null; role: string | null }> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return { id: null, role: null };
  return { id: user.id, role: user.role ?? "user" };
}

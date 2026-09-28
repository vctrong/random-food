import { listCleanupRuns } from "@/lib/media/cleanupService";
import { MediaCleanupContent } from "@/components/admin/MediaCleanupContent";

export const dynamic = "force-dynamic";

/** Danh sách ảnh rác tải phía client (gọi Cloudinary, có thể chậm) — lịch sử lấy sẵn từ DB. */
export default async function AdminMediaCleanupPage() {
  const runs = await listCleanupRuns();
  return <MediaCleanupContent initialRuns={runs} />;
}

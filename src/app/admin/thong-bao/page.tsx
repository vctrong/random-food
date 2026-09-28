import { listAdminAnnouncements } from "@/lib/announcements";
import { AnnouncementsContent } from "@/components/admin/AnnouncementsContent";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const rows = await listAdminAnnouncements();
  return <AnnouncementsContent initialRows={rows} />;
}

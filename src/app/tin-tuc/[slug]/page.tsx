import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewerRole";
import { getAnnouncementPreview, getPublicAnnouncement, listOtherAnnouncements } from "@/lib/announcements";
import { AnnouncementDetailView } from "@/components/announcements/AnnouncementDetailView";

export const dynamic = "force-dynamic";

async function loadAnnouncement(slug: string, preview: boolean) {
  const viewer = await getViewer();
  // Admin xem trước mọi trạng thái (nháp / hẹn giờ / hết hạn / khác đối tượng).
  const isPreview = preview && viewer.role === "admin";
  const announcement = isPreview ? await getAnnouncementPreview(slug) : await getPublicAnnouncement(slug, viewer.role);
  return { announcement, isPreview, role: viewer.role };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/tin-tuc/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const { announcement, isPreview } = await loadAnnouncement(slug, preview === "1");
  if (!announcement) return { title: "Không tìm thấy thông báo", robots: { index: false } };
  return {
    title: announcement.title,
    description: announcement.summary,
    ...(isPreview && { robots: { index: false, follow: false } }),
    openGraph: { title: announcement.title, description: announcement.summary, type: "article" },
  };
}

export default async function AnnouncementPage({ params, searchParams }: PageProps<"/tin-tuc/[slug]">) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const { announcement, isPreview, role } = await loadAnnouncement(slug, preview === "1");
  if (!announcement) notFound();

  const others = await listOtherAnnouncements(role, announcement.slug);
  return <AnnouncementDetailView announcement={announcement} others={others} isPreview={isPreview} />;
}

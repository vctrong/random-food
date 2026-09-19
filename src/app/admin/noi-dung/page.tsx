import { getContentRows } from "@/lib/admin/content";
import { ContentModerationContent } from "@/components/admin/ContentModerationContent";

export default async function AdminContentPage() {
  const rows = await getContentRows();
  return <ContentModerationContent initialRows={rows} />;
}

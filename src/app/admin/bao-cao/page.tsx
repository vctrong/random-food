import { getReports } from "@/lib/admin/reports";
import { ReportsContent } from "@/components/admin/ReportsContent";

export default async function AdminReportsPage() {
  const reports = await getReports();
  return <ReportsContent initialReports={reports} />;
}

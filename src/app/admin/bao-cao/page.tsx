import { listReportCases } from "@/lib/admin/reportCases";
import { ReportCasesContent } from "@/components/admin/ReportCasesContent";

/** CHỈ Admin xử lý báo cáo (BR-A09) — layout /admin đã chặn role khác. */
export default async function AdminReportsPage() {
  const cases = await listReportCases({ status: "pending" });
  return <ReportCasesContent initialCases={cases} />;
}

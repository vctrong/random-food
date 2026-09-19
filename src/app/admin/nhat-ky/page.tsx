import { getAuditLog } from "@/lib/admin/auditLog";
import { AuditLogContent } from "@/components/admin/AuditLogContent";

export default async function AdminAuditLogPage() {
  const { entries, total } = await getAuditLog({ page: 1, pageSize: 20 });
  return <AuditLogContent initialEntries={entries} initialTotal={total} />;
}

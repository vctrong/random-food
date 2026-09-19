import { connectDB } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";
import type { AdminAuditLogRow } from "@/types/admin";

export interface AuditLogFilter {
  action?: string;
  targetType?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog({
  action,
  targetType,
  page = 1,
  pageSize = 20,
}: AuditLogFilter): Promise<{ entries: AdminAuditLogRow[]; total: number }> {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("actorId", "name")
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  const entries: AdminAuditLogRow[] = logs.map((log) => {
    const actor = log.actorId as unknown as { _id?: unknown; name?: string } | null;
    return {
      id: String(log._id),
      actor: actor?._id ? { id: String(actor._id), name: actor.name ?? "" } : null,
      action: log.action,
      targetType: log.targetType,
      targetId: String(log.targetId),
      reason: log.reason ?? null,
      metadata: (log.metadata ?? {}) as Record<string, unknown>,
      createdAt: (log.createdAt ?? new Date()).toISOString(),
    };
  });

  return { entries, total };
}

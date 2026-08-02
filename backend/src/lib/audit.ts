import { prisma } from "./prisma";

interface AuditParams {
  workspaceId: string;
  agentId?: string;
  userId?: string;
  action: string;
  details?: Record<string, string | number | boolean | null | object>;
}

export async function audit(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      agentId: params.agentId,
      userId: params.userId,
      action: params.action,
      details: params.details ?? {},
    },
  });
}

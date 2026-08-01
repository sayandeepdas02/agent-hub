import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { formatDateTime } from "@/lib/utils";

export default async function AuditLogPage() {
  const workspace = await prisma.workspace.findFirst();

  const logs = workspace
    ? await prisma.auditLog.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { timestamp: "desc" },
        take: 200,
        include: { agent: true, user: true },
      })
    : [];

  return (
    <>
      <TopBar section="Audit Log" />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
            Audit Log
          </h2>
          <p className="text-xs font-mono text-[var(--color-text-tertiary)] mt-0.5">
            All actions across all agents and platform
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-6 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider w-40">
                  Timestamp
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider w-32">
                  Agent
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider w-48">
                  Action
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Details
                </th>
                <th className="text-right px-6 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider w-32">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-[var(--color-text-tertiary)]"
                  >
                    No audit entries yet
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const details = log.details as Record<string, unknown>;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--color-surface-raised)] transition-colors"
                  >
                    <td className="px-6 py-2.5 font-mono text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.agent ? (
                        <span className="font-mono text-xs text-[var(--color-primary)]">
                          {log.agent.name}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                          platform
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-primary)]">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-tertiary)] max-w-xs truncate">
                      {Object.entries(details)
                        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                        .join(" ")}
                    </td>
                    <td className="px-6 py-2.5 text-right font-mono text-xs text-[var(--color-text-tertiary)]">
                      {log.user?.email ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

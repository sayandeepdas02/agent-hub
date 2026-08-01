import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { notFound } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import { StatusPill } from "@/components/platform/StatusPill";
import { SourceIcon } from "@/components/platform/SourceIcon";
import Link from "next/link";

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ agentSlug: string }>;
}) {
  const { agentSlug } = await params;

  const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
  if (!agent) notFound();

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [ordersToday, pendingReview, completed, failed, recent] =
    await Promise.all([
      prisma.order.count({
        where: { workspaceId: workspace.id, createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: { workspaceId: workspace.id, status: "REVIEW_NEEDED" },
      }),
      prisma.order.count({
        where: { workspaceId: workspace.id, status: "COMPLETED" },
      }),
      prisma.order.count({
        where: { workspaceId: workspace.id, status: "FAILED" },
      }),
      prisma.auditLog.findMany({
        where: { workspaceId: workspace.id, agentId: agent.id },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
    ]);

  const tiles = [
    { label: "Orders Today", value: ordersToday, accent: "var(--color-primary)" },
    { label: "Pending Review", value: pendingReview, accent: "var(--color-amber)" },
    { label: "Completed", value: completed, accent: "var(--color-green)" },
    { label: "Failed", value: failed, accent: "var(--color-rust)" },
  ];

  return (
    <>
      <TopBar agentName={agent.name} section="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4"
            >
              <p className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">
                {tile.label}
              </p>
              <p
                className="mt-2 text-3xl font-bold font-mono"
                style={{ color: tile.accent }}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {recent.length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--color-text-tertiary)] text-center">
                No activity yet
              </p>
            )}
            {recent.map((log) => {
              const details = log.details as Record<string, unknown>;
              return (
                <div
                  key={log.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-[var(--color-text-tertiary)] shrink-0">
                      {log.action}
                    </span>
                    {typeof details.orderId === "string" && (
                      <Link
                        href={`/agents/${agentSlug}/orders/${details.orderId}`}
                        className="font-mono text-xs text-[var(--color-primary)] truncate hover:underline"
                      >
                        {details.orderId.slice(-8)}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[var(--color-text-tertiary)] shrink-0">
                    {formatRelative(log.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick nav to queue */}
        {pendingReview > 0 && (
          <div className="flex items-center gap-3 bg-[var(--color-status-review-bg)] border border-[var(--color-amber)]/30 rounded-lg px-4 py-3">
            <span className="text-sm text-[var(--color-amber)] font-medium">
              {pendingReview} order{pendingReview !== 1 ? "s" : ""} awaiting review
            </span>
            <Link
              href={`/agents/${agentSlug}/queue`}
              className="ml-auto text-sm font-medium text-[var(--color-amber)] hover:underline"
            >
              Go to queue →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

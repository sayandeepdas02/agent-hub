import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { StatusPill } from "@/components/platform/StatusPill";
import { SourceIcon } from "@/components/platform/SourceIcon";
import { notFound } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

export default async function ReviewQueuePage({
  params,
}: {
  params: Promise<{ agentSlug: string }>;
}) {
  const { agentSlug } = await params;

  const { workspaceId } = await requireAuth();
  const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
  if (!agent) notFound();

  const orders = await prisma.order.findMany({
    where: { workspaceId, status: "REVIEW_NEEDED" },
    include: { customer: true, parsedData: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <TopBar agentName={agent.name} section="Review Queue" />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex items-center gap-3">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
            Needs Review
          </h2>
          <span className="font-mono text-xs bg-[var(--color-status-review-bg)] text-[var(--color-amber)] px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-tertiary)]">
              <p className="text-sm">Queue is clear</p>
              <p className="text-xs font-mono">No orders awaiting review</p>
            </div>
          )}

          <div className="divide-y divide-[var(--color-border)]">
            {orders.map((order) => {
              const conf = order.parsedData?.orderConfidence ?? null;
              return (
                <Link
                  key={order.id}
                  href={`/agents/${agentSlug}/orders/${order.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-[var(--color-surface-raised)] transition-colors group"
                >
                  <span className="font-mono text-xs text-[var(--color-primary)] w-20 shrink-0">
                    {order.id.slice(-8)}
                  </span>

                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">
                    {order.customer?.name ?? (
                      <span className="text-[var(--color-text-tertiary)] italic">
                        Unknown customer
                      </span>
                    )}
                  </span>

                  <SourceIcon source={order.source} />

                  {conf !== null && (
                    <span
                      className="font-mono text-xs shrink-0"
                      style={{
                        color:
                          conf >= 0.9
                            ? "var(--color-green)"
                            : "var(--color-amber)",
                      }}
                    >
                      {(conf * 100).toFixed(0)}% conf
                    </span>
                  )}

                  <span className="font-mono text-xs text-[var(--color-text-tertiary)] shrink-0">
                    {formatRelative(order.createdAt)}
                  </span>

                  <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

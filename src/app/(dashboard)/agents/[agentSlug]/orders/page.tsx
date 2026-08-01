import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { StatusPill } from "@/components/platform/StatusPill";
import { SourceIcon } from "@/components/platform/SourceIcon";
import { notFound } from "next/navigation";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";
import type { OrderStatus, OrderSource } from "@prisma/client";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentSlug: string }>;
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const { agentSlug } = await params;
  const { status, source } = await searchParams;

  const { workspaceId } = await requireAuth();
  const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
  if (!agent) notFound();

  const orders = await prisma.order.findMany({
    where: {
      workspaceId,
      ...(status ? { status: status as OrderStatus } : {}),
      ...(source ? { source: source as OrderSource } : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses: OrderStatus[] = [
    "PENDING",
    "REVIEW_NEEDED",
    "COMPLETED",
    "FAILED",
  ];

  return (
    <>
      <TopBar agentName={agent.name} section="Orders" />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2 shrink-0">
          <Link
            href={`/agents/${agentSlug}/orders`}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
              !status
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
            }`}
          >
            All
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/agents/${agentSlug}/orders?status=${s}`}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                status === s
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
              }`}
            >
              {s.replace("_", " ")}
            </Link>
          ))}
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-6 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Source
                </th>
                <th className="text-right px-6 py-2.5 text-xs font-mono font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-[var(--color-text-tertiary)]"
                  >
                    No orders found
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-[var(--color-surface-raised)] transition-colors group"
                >
                  <td className="px-6 py-2.5">
                    <Link
                      href={`/agents/${agentSlug}/orders/${order.id}`}
                      className="font-mono text-xs text-[var(--color-primary)] group-hover:underline"
                    >
                      {order.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                    {order.customer?.name ?? (
                      <span className="text-[var(--color-text-tertiary)] italic">
                        Unknown
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <SourceIcon source={order.source} />
                  </td>
                  <td className="px-6 py-2.5 text-right font-mono text-xs text-[var(--color-text-tertiary)]">
                    {formatRelative(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

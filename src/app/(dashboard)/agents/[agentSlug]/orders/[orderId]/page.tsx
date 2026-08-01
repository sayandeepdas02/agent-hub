import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/platform/shell/TopBar";
import { ReviewSplitPane } from "@/components/platform/ReviewSplitPane";
import { AgentRunTimeline } from "@/components/platform/AgentRunTimeline";
import { StatusPill } from "@/components/platform/StatusPill";
import { SourceIcon } from "@/components/platform/SourceIcon";
import { OrderReviewForm } from "@/components/agents/order-intake/OrderReviewForm";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import type { TimelineStage } from "@/components/platform/AgentRunTimeline";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ agentSlug: string; orderId: string }>;
}) {
  const { agentSlug, orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      rawMessages: { orderBy: { createdAt: "asc" } },
      parsedData: true,
      duplicateOf: { select: { id: true } },
    },
  });

  if (!order) notFound();

  const auditEntries = await prisma.auditLog.findMany({
    where: {
      details: { path: ["orderId"], equals: orderId },
    },
    orderBy: { timestamp: "asc" },
  });

  // Build timeline from audit entries
  const actionToStage: Record<string, string> = {
    "order.received": "received",
    "order.auto_created": "created",
    "order.needs_review": "review",
    "order.approved": "created",
    "order.rejected": "failed",
    "order.extraction_failed": "failed",
  };

  const stageOrder = ["received", "extracted", "review", "created", "notified"];

  const completedActions = new Set(
    auditEntries.map((e) => actionToStage[e.action]).filter(Boolean)
  );

  const hasExtracted = !!order.parsedData;
  if (hasExtracted) completedActions.add("extracted");

  const stages: TimelineStage[] = [
    { id: "received", label: "Received", status: completedActions.has("received") ? "done" : "pending" },
    { id: "extracted", label: "Extracted", status: hasExtracted ? "done" : order.status === "FAILED" ? "failed" : "pending" },
    {
      id: "review",
      label: "Review",
      status:
        order.status === "REVIEW_NEEDED"
          ? "active"
          : completedActions.has("review")
          ? "done"
          : "pending",
    },
    {
      id: "created",
      label: "Created",
      status:
        order.status === "COMPLETED"
          ? "done"
          : order.status === "FAILED"
          ? "failed"
          : "pending",
    },
    { id: "notified", label: "Notified", status: order.status === "COMPLETED" ? "done" : "pending" },
  ];

  const parsedFields = (order.parsedData?.data ?? {}) as Record<
    string,
    { value: unknown; confidence: number }
  >;
  const fieldConfidence = (order.parsedData?.fieldConfidence ?? {}) as Record<
    string,
    number
  >;

  const rawMessage = order.rawMessages[0];

  return (
    <>
      <TopBar agentName="Order Intake" section="Order Detail" />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Order header */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-4 shrink-0">
          <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
            Order
          </span>
          <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
            {orderId.slice(-8)}
          </span>
          <StatusPill status={order.status} />
          <SourceIcon source={order.source} />
          {order.duplicateOf && (
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-[var(--color-status-failed-bg)] text-[var(--color-rust)]">
              Duplicate of {order.duplicateOf.id.slice(-8)}
            </span>
          )}
          <span className="ml-auto text-xs font-mono text-[var(--color-text-tertiary)]">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        <ReviewSplitPane
          left={
            <div className="space-y-6">
              {/* Raw message */}
              <div>
                <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                  Source Message
                </h3>
                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-4">
                  <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono leading-relaxed">
                    {rawMessage?.text ?? "No message content"}
                  </pre>
                </div>
              </div>

              {/* AI extraction results */}
              {order.parsedData && (
                <div>
                  <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                    Extraction Results
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(parsedFields).map(([key, field]) => {
                      const conf = fieldConfidence[key] ?? 0;
                      const confColor =
                        conf >= 0.9
                          ? "var(--color-green)"
                          : "var(--color-amber)";
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--color-border)] last:border-0"
                        >
                          <span className="text-xs font-mono text-[var(--color-text-tertiary)] w-40 shrink-0">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm text-[var(--color-text-primary)] flex-1">
                            {field.value !== null && field.value !== undefined
                              ? String(field.value)
                              : "—"}
                          </span>
                          <span
                            className="text-xs font-mono shrink-0"
                            style={{ color: confColor }}
                          >
                            {(conf * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs font-mono text-[var(--color-text-tertiary)]">
                    Order confidence:{" "}
                    <span
                      style={{
                        color:
                          (order.parsedData.orderConfidence ?? 0) >= 0.9
                            ? "var(--color-green)"
                            : "var(--color-amber)",
                      }}
                    >
                      {((order.parsedData.orderConfidence ?? 0) * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
              )}

              {/* Pipeline timeline */}
              <div>
                <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4">
                  Pipeline
                </h3>
                <AgentRunTimeline stages={stages} />
              </div>
            </div>
          }
          right={
            <OrderReviewForm
              order={{
                id: order.id,
                status: order.status,
                customerId: order.customerId,
                customerName: order.customer?.name,
              }}
              agentSlug={agentSlug}
              extractedFields={parsedFields}
            />
          }
        />
      </div>
    </>
  );
}

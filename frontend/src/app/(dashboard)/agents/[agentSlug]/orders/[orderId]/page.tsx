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
import type { ExtractedField, ExtractedLineItem, Issue } from "@/lib/agents/contract";

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
    where: { details: { path: ["orderId"], equals: orderId } },
    orderBy: { timestamp: "asc" },
  });

  const actionToStage: Record<string, string> = {
    "order.received": "received",
    "order.auto_created": "created",
    "order.needs_review": "review",
    "order.approved": "created",
    "order.rejected": "failed",
    "order.extraction_failed": "failed",
  };

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
      status: order.status === "COMPLETED" ? "done" : order.status === "FAILED" ? "failed" : "pending",
    },
    { id: "notified", label: "Notified", status: order.status === "COMPLETED" ? "done" : "pending" },
  ];

  const parsedFields = (order.parsedData?.data ?? {}) as unknown as Record<string, ExtractedField>;
  const parsedLineItems = (order.parsedData?.lineItems ?? []) as unknown as ExtractedLineItem[];
  const validationIssues = (order.parsedData?.issues ?? []) as unknown as Issue[];
  const fieldConfidence = (order.parsedData?.fieldConfidence ?? {}) as unknown as Record<string, number>;

  const rawMessage = order.rawMessages[0];

  return (
    <>
      <TopBar agentName="Order Intake" section="Order Detail" />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Order header */}
        <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-4 shrink-0">
          <span className="font-mono text-xs text-[var(--color-text-tertiary)]">Order</span>
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

              {/* Top-level extracted fields */}
              {order.parsedData && (
                <div>
                  <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                    Extracted Header
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(parsedFields).map(([key, field]) => {
                      const conf = fieldConfidence[key] ?? field.confidence ?? 0;
                      const confColor = conf >= 0.9 ? "var(--color-green)" : "var(--color-amber)";
                      return (
                        <div
                          key={key}
                          className="flex items-start justify-between gap-4 py-1.5 border-b border-[var(--color-border)] last:border-0"
                        >
                          <span className="text-xs font-mono text-[var(--color-text-tertiary)] w-36 shrink-0 pt-0.5">
                            {key.replace(/_/g, " ")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-[var(--color-text-primary)]">
                              {field.value !== null && field.value !== undefined
                                ? String(field.value)
                                : "—"}
                            </span>
                            {field.sourceLocation && (
                              <p className="text-xs font-mono text-[var(--color-text-tertiary)] mt-0.5 truncate">
                                &ldquo;{field.sourceLocation}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-mono shrink-0 pt-0.5" style={{ color: confColor }}>
                            {(conf * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs font-mono text-[var(--color-text-tertiary)]">
                    Order confidence:{" "}
                    <span
                      style={{
                        color:
                          (order.parsedData.orderConfidence ?? 0) >= 0.7
                            ? "var(--color-green)"
                            : "var(--color-amber)",
                      }}
                    >
                      {((order.parsedData.orderConfidence ?? 0) * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
              )}

              {/* Line items */}
              {parsedLineItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                    Line Items ({parsedLineItems.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          {["SKU", "Name", "Qty", "Price", "Color", "Size", "UOM"].map((h) => (
                            <th key={h} className="text-left py-1.5 pr-3 text-[var(--color-text-tertiary)] font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedLineItems.map((item, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.product_sku} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.product_name} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.quantity} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.unit_price} prefix="$" />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.color} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.size} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <LineItemCell field={item.uom} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
              extractedLineItems={parsedLineItems}
              validationIssues={validationIssues}
            />
          }
        />
      </div>
    </>
  );
}

function LineItemCell({
  field,
  prefix = "",
}: {
  field: ExtractedField;
  prefix?: string;
}) {
  const val = field.value;
  const conf = field.confidence ?? 0;
  const confColor = conf >= 0.9 ? "var(--color-green)" : conf >= 0.7 ? "var(--color-amber)" : "var(--color-rust)";

  if (val === null || val === undefined) {
    return <span className="text-[var(--color-text-tertiary)]">—</span>;
  }

  return (
    <span
      className="font-mono"
      style={{ color: conf < 0.7 ? "var(--color-amber)" : "var(--color-text-primary)" }}
      title={`${(conf * 100).toFixed(0)}% confidence${field.sourceLocation ? `\n"${field.sourceLocation}"` : ""}`}
    >
      <span style={{ borderBottom: `1px dotted ${confColor}` }}>
        {prefix}{String(val)}
      </span>
      {field.alternatives && field.alternatives.length > 0 && (
        <span className="ml-1 text-[var(--color-text-tertiary)]">
          (+{field.alternatives.length})
        </span>
      )}
    </span>
  );
}

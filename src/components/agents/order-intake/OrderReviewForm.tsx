"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ExtractedField {
  value: unknown;
  confidence: number;
}

interface OrderReviewFormProps {
  order: {
    id: string;
    status: string;
    customerId: string | null;
    customerName?: string;
  };
  agentSlug: string;
  extractedFields: Record<string, ExtractedField>;
}

export function OrderReviewForm({
  order,
  agentSlug,
  extractedFields,
}: OrderReviewFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Editable field state — seeded from AI extraction
  const [customerName, setCustomerName] = useState(
    stringify(extractedFields["customer_name"]?.value) ??
      order.customerName ??
      ""
  );
  const [productSku, setProductSku] = useState(
    stringify(extractedFields["product_sku"]?.value) ?? ""
  );
  const [quantity, setQuantity] = useState(
    stringify(extractedFields["quantity"]?.value) ?? ""
  );
  const [shipDate, setShipDate] = useState(
    stringify(extractedFields["requested_ship_date"]?.value) ?? ""
  );
  const [instructions, setInstructions] = useState(
    stringify(extractedFields["special_instructions"]?.value) ?? ""
  );

  const isPending = order.status === "REVIEW_NEEDED";

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || undefined,
          productSku: productSku || undefined,
          quantity: quantity ? Number(quantity) : undefined,
          requestedShipDate: shipDate || undefined,
          specialInstructions: instructions || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Approval failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError("Reason is required");
      return;
    }
    setLoading("reject");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Rejection failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  const fields = [
    {
      key: "customer_name",
      label: "Customer",
      value: customerName,
      onChange: setCustomerName,
      type: "text" as const,
    },
    {
      key: "product_sku",
      label: "Product / SKU",
      value: productSku,
      onChange: setProductSku,
      type: "text" as const,
    },
    {
      key: "quantity",
      label: "Quantity",
      value: quantity,
      onChange: setQuantity,
      type: "number" as const,
    },
    {
      key: "requested_ship_date",
      label: "Ship Date",
      value: shipDate,
      onChange: setShipDate,
      type: "text" as const,
    },
    {
      key: "special_instructions",
      label: "Instructions",
      value: instructions,
      onChange: setInstructions,
      type: "text" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4">
          Order Details
        </h3>

        <div className="space-y-3">
          {fields.map(({ key, label, value, onChange, type }) => {
            const conf = extractedFields[key]?.confidence;
            const hasConf = conf !== undefined;
            const confColor =
              hasConf && conf >= 0.9
                ? "var(--color-green)"
                : "var(--color-amber)";

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-[var(--color-text-tertiary)]">
                    {label}
                  </label>
                  {hasConf && (
                    <span
                      className="text-xs font-mono"
                      style={{ color: confColor }}
                      title="AI confidence score"
                    >
                      {(conf * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={!isPending}
                  className={cn(
                    "w-full text-sm px-3 py-1.5 rounded border bg-[var(--color-surface-raised)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                    "focus:outline-none focus:border-[var(--color-primary)] transition-colors",
                    isPending
                      ? "border-[var(--color-border)] cursor-text"
                      : "border-[var(--color-border)] opacity-60 cursor-default",
                    hasConf && conf < 0.9 && isPending
                      ? "border-l-2 border-l-[var(--color-amber)]"
                      : ""
                  )}
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
          {error && (
            <p className="text-xs font-mono text-[var(--color-rust)]">{error}</p>
          )}

          {showReject ? (
            <div className="space-y-2">
              <textarea
                className="w-full text-sm border border-[var(--color-border)] rounded p-2 font-mono resize-none bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                rows={3}
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading !== null}
                  className="flex-1 py-1.5 text-sm font-medium rounded bg-[var(--color-rust)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {loading === "reject" ? "Rejecting…" : "Confirm Reject"}
                </button>
                <button
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason("");
                    setError(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex-1 py-2 text-sm font-medium rounded bg-[var(--color-primary)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {loading === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={loading !== null}
                className="flex-1 py-2 text-sm font-medium rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {!isPending && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
            Status:{" "}
            <span className="text-[var(--color-text-secondary)]">
              {order.status}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function stringify(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  return String(v);
}
